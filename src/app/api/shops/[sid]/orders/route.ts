import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/token";
import { createOrder, getOrders, getPickupSlotCounts, getShop, getOrderForShop, getOrdersInRange, getUser } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function formatBangkokTime(value: unknown) {
  if (!value) return "";

  let d: Date;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    d = value;
  } else {
    const raw = String(value).trim();
    if (!raw) return "";

    const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(raw);
    const looksLikeDateTime = /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/.test(raw);
    const normalized =
      !hasZone && looksLikeDateTime
        ? `${raw.replace(" ", "T")}+07:00`
        : raw;

    d = new Date(normalized);

    if (Number.isNaN(d.getTime())) {
      const t = raw.includes("T") ? raw.split("T")[1] : raw;
      const [h, m] = t.slice(0, 5).split(":").map(Number);
      if (Number.isFinite(h) && Number.isFinite(m)) {
        const startMin = h * 60 + m;
        const endMin = startMin + 5;
        const eh = Math.floor(endMin / 60) % 24;
        const em = endMin % 60;
        const startStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        const endStr = `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
        return `${startStr}–${endStr}`;
      }
      return t.slice(0, 5);
    }
  }

  const start = d;
  const end = new Date(start.getTime() + 5 * 60000);

  const startText = start.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  });

  const endText = end.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  });

  return `${startText}–${endText}`;
}

export async function GET(req: Request, { params }: { params: Promise<{ sid: string }> }) {
  try {
    const { sid } = await params;
    const { searchParams } = new URL(req.url);
    if (searchParams.get("pickupSlots") === "1") {
      const date =
        searchParams.get("date") ||
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Bangkok",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date());
      const slots = await getPickupSlotCounts(sid, date);
      return NextResponse.json(
        {
          date,
          start: "00:00",
          end: "23:55",
          intervalMinutes: 15,
          limitPerSlot: 8,
          slots,
        },
        { headers: noStoreHeaders }
      );
    }
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const offset = Number(searchParams.get("offset") || "0");
    const limit = Number(searchParams.get("limit") || "20");
    if (from && to) {
      const data = await getOrdersInRange(sid, from, to, offset, limit);
      return NextResponse.json(data, { headers: noStoreHeaders });
    }
    const orders = await getOrders(sid);
    return NextResponse.json(orders || [], { headers: noStoreHeaders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ sid: string }> }) {
  const { sid } = await params;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value || cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyAccessToken(token);
    const uid = payload && typeof payload === "object" && "uid" in payload ? String(payload.uid) : null;
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = payload && typeof payload === "object" && "role" in payload ? String(payload.role) : "";
    const normalizedRole = role.trim().toLowerCase();
    if (normalizedRole === "owner" || normalizedRole === "shop") {
      // Debugging: Log why this user is considered an owner
      console.log(`Blocked order from owner: uid=${uid}, role=${normalizedRole}`);
      return NextResponse.json({ error: "owners-cannot-order" }, { status: 403 });
    }

    const shop = await getShop(sid);
    if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    
    // Check if shop is open
    const status = shop.status ? String(shop.status).trim().toLowerCase() : "closed";
    if (status !== "open") {
      return NextResponse.json({ error: "shop-closed" }, { status: 400 });
    }

    const body = await req.json();
    const pickupTime: string | undefined = body?.pickupTime;
    const noteRaw: unknown = body?.note;
    const itemsRaw: unknown = body?.items;

    const note = typeof noteRaw === "string" ? noteRaw : null;
    const pickupTimeVal = typeof pickupTime === "string" && pickupTime ? pickupTime : null;
    if (!Array.isArray(itemsRaw) || itemsRaw.length === 0) {
      return NextResponse.json({ error: "items required" }, { status: 400 });
    }

    const items = itemsRaw
      .map((it) => ({
        menuItemId: typeof it?.menuItemId === "string" ? it.menuItemId : "",
        quantity: Number(it?.quantity),
        note: typeof it?.note === "string" ? it.note : null,
      }))
      .filter((it) => it.menuItemId && Number.isFinite(it.quantity) && it.quantity > 0);

    if (items.length === 0) return NextResponse.json({ error: "invalid items" }, { status: 400 });

    const order = await createOrder(sid, uid, pickupTimeVal, note, items);
    
    const line_push = null;
    
    // Send email to customer
    try {
      if (uid) {
        const user = await getUser(uid);
        if (user && user.email) {
          const full = await getOrderForShop(order.id, sid);
          const pickup = full?.pickup_time ? formatBangkokTime(full.pickup_time) : "ASAP";
          const orderIdShort = order.id.slice(0, 8);
          
          const html = `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
              <h2 style="color: #333;">Your order has been received.</h2>
              <p>We've received your order <strong>#${orderIdShort}</strong>.</p>
              <p><strong>Pickup Time:</strong> ${pickup}</p>
              <p><strong>Shop:</strong> ${shop?.name || "Unknown Shop"}</p>
              <p>The shop will review your order shortly. You will be notified once it is confirmed.</p>
              <p>Please come to the shop to collect it.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="color: #999; font-size: 12px;">Thanks for ordering from <strong>AU Canteen</strong>!</p>
            </div>
          `;
          sendEmail(user.email, `Order #${orderIdShort} Received`, html).catch(console.error);
        }
      }
    } catch (e) {
      console.error("Failed to send confirmation email", e);
    }

    return NextResponse.json({ ...order, line_push }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create order";
    if (message === "out-of-stock") return NextResponse.json({ error: "out-of-stock" }, { status: 409 });
    if (message === "invalid-item") return NextResponse.json({ error: "invalid-item" }, { status: 400 });
    if (message === "invalid-quantity") return NextResponse.json({ error: "invalid-quantity" }, { status: 400 });
    if (message === "slot-full") return NextResponse.json({ error: "slot-full" }, { status: 409 });
    console.error("Error creating order:", message);
    if (message.includes('relation "order_items" does not exist')) {
        return NextResponse.json({ error: "System maintenance: Please try again in 1 minute" }, { status: 503 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

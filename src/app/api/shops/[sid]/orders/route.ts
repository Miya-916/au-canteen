import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/token";
import { createOrder, getOrders, getPickupSlotCounts, getShop, getOrderForShop, getOrdersInRange } from "@/lib/db";

export const runtime = "nodejs";

async function sendLinePush(to: string, messages: unknown[]) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  if (!to) return { attempted: false, ok: false, error: "missing-recipient" as const };
  if (!token) return { attempted: false, ok: false, error: "missing-token" as const };
  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ to, messages }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("line-push-failed", res.status, body.slice(0, 400));
      return { attempted: true, ok: false, status: res.status, error: body.slice(0, 400) };
    }
    return { attempted: true, ok: true, status: res.status };
  } catch (e) {
    console.error("line-push-failed", e);
    return { attempted: true, ok: false, error: e instanceof Error ? e.message : "unknown-error" };
  }
}

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
      return NextResponse.json({
        date,
        start: "07:00",
        end: "24:00",
        intervalMinutes: 5,
        limitPerSlot: 1,
        slots,
      });
    }
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const offset = Number(searchParams.get("offset") || "0");
    const limit = Number(searchParams.get("limit") || "20");
    if (from && to) {
      const data = await getOrdersInRange(sid, from, to, offset, limit);
      return NextResponse.json(data);
    }
    const orders = await getOrders(sid);
    return NextResponse.json(orders || []);
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
    if (role === "owner") {
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
    
    let line_push:
      | { attempted: boolean; ok: boolean; status?: number; error?: string }
      | null = null;

    try {
      const shop = await getShop(sid);
      const to = shop?.line_recipient_id ? String(shop.line_recipient_id).trim() : "";
      if (!to) {
        line_push = { attempted: false, ok: false, error: "missing-line-recipient-id" };
      } else {
        const full = await getOrderForShop(order.id, sid);
        const pickup = full?.pickup_time ? formatBangkokTime(full.pickup_time) : "";
        const pickupText = pickup || "ASAP";
        const noteText = full?.note ? String(full.note) : "-";
        const total = typeof full?.total_amount === "number" ? full.total_amount : Number(full?.total_amount || 0);
        const rawItems: unknown =
          full && typeof full === "object" && "items" in full ? (full as { items?: unknown }).items : undefined;
        const itemsList = Array.isArray(rawItems) ? rawItems : [];
        const maxItems = 12;
        const shownItems = itemsList.slice(0, maxItems);
        const extraItems = Math.max(0, itemsList.length - shownItems.length);

        const itemBoxes = shownItems
          .map((it) => {
            const obj = it && typeof it === "object" ? (it as Record<string, unknown>) : {};
            const qty = Number(obj.quantity || 0);
            const name = String(obj.name || "Item");
            const note = obj.note ? String(obj.note) : "";
            return {
              type: "box",
              layout: "horizontal",
              contents: [
                { type: "text", text: `${Number.isFinite(qty) ? qty : 0}x`, size: "sm", color: "#111111", flex: 1 },
                {
                  type: "box",
                  layout: "vertical",
                  flex: 4,
                  contents: [
                    { type: "text", text: name, size: "sm", color: "#555555", wrap: true },
                    ...(note
                      ? [
                          {
                            type: "text",
                            text: `Note: ${note}`,
                            size: "xs",
                            color: "#888888",
                            wrap: true,
                            margin: "xs",
                          },
                        ]
                      : []),
                  ],
                },
              ],
            };
          })
          .filter(Boolean);
        const safeItemBoxes =
          itemBoxes.length > 0
            ? [
                ...itemBoxes,
                ...(extraItems > 0
                  ? [
                      {
                        type: "text",
                        text: `+ ${extraItems} more`,
                        size: "sm",
                        color: "#888888",
                        margin: "sm"
                      },
                    ]
                  : []),
              ]
            : [{ type: "text", text: "Items: -", size: "sm", color: "#555555" }];
        const flexContents = {
          type: "bubble",
          header: {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "🆕 New Order Received", weight: "bold", color: "#111111", size: "sm" },
              { type: "text", text: `#${String(order.id).slice(0, 8)}`, weight: "bold", size: "xl", margin: "md" }
            ]
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "box",
                layout: "vertical",
                spacing: "sm",
                contents: safeItemBoxes
              },
              { type: "separator", margin: "lg" },
              {
                type: "box",
                layout: "horizontal",
                margin: "lg",
                contents: [
                  { type: "text", text: "Total", size: "sm", color: "#555555" },
                  { type: "text", text: `฿${Number(total).toFixed(0)}`, size: "sm", color: "#111111", align: "end", weight: "bold" }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                margin: "sm",
                contents: [
                  { type: "text", text: "Pickup", size: "sm", color: "#555555" },
                  { type: "text", text: pickupText, size: "sm", color: "#111111", align: "end" }
                ]
              },
              ...(noteText !== "-" ? [{
                type: "box",
                layout: "horizontal",
                margin: "sm",
                contents: [
                  { type: "text", text: "Note", size: "sm", color: "#555555" },
                  { type: "text", text: noteText, size: "sm", color: "#111111", align: "end", wrap: true }
                ]
              }] : []),
              { type: "separator", margin: "lg" },
              {
                type: "box",
                layout: "vertical",
                spacing: "sm",
                contents: [
                  {
                    type: "button",
                    style: "primary",
                    color: "#1DB446",
                    action: {
                      type: "postback",
                      label: "Accept Order",
                      data: `shopId=${sid}&orderId=${order.id}&status=accepted`,
                      displayText: "Accepting order..."
                    }
                  },
                  {
                    type: "button",
                    style: "secondary",
                    color: "#E02424",
                    action: {
                      type: "postback",
                      label: "Reject Order",
                      data: `shopId=${sid}&orderId=${order.id}&status=cancelled`,
                      displayText: "Rejecting order..."
                    }
                  }
                ]
              }
            ]
          }
        };
        line_push = await sendLinePush(to, [
          { type: "text", text: `New order received\nOrder ID: ${String(order.id).slice(0, 8)}\nPickup Time: ${pickupText}` },
          { type: "flex", altText: `Order #${String(order.id).slice(0, 8)} pending`, contents: flexContents }
        ]);
      }
    } catch (e) {
      console.error("Failed to send LINE notification for new order", e);
      line_push = { attempted: true, ok: false, error: e instanceof Error ? e.message : "unknown-error" };
    }
    
    return NextResponse.json({ ...order, line_push }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create order";
    if (message === "out-of-stock") return NextResponse.json({ error: "out-of-stock" }, { status: 409 });
    if (message === "invalid-item") return NextResponse.json({ error: "invalid-item" }, { status: 400 });
    if (message === "invalid-quantity") return NextResponse.json({ error: "invalid-quantity" }, { status: 400 });
    if (message === "slot-full") return NextResponse.json({ error: "slot-full" }, { status: 409 });
    console.error("Error creating order:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

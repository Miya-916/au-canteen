import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/token";
import { createOrder, getOrders, getPickupSlotCounts, getShop, getOrderForShop, getOrdersInRange, getUser } from "@/lib/db";
import { sendLinePush, formatBangkokTime } from "@/lib/line";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

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
    if (role === "owner") {
      // Debugging: Log why this user is considered an owner
      console.log(`Blocked order from owner: uid=${uid}, role=${role}`);
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
              <h2 style="color: #333;">Order Received! 🎉</h2>
              <p>Your order #${orderIdShort} has been placed successfully.</p>
              <p><strong>Pickup Time:</strong> ${pickup}</p>
              <p><strong>Shop:</strong> ${shop?.name || "Unknown Shop"}</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="color: #999; font-size: 12px;">AU Canteen System</p>
            </div>
          `;
          sendEmail(user.email, `Order #${orderIdShort} Confirmation`, html).catch(console.error);
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

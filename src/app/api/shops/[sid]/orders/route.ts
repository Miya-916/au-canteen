import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/token";
import { createOrder, getOrders, getPickupSlotCounts, getShop, getOrderForShop, getOrdersInRange } from "@/lib/db";

export const runtime = "nodejs";

async function sendLinePush(to: string, messages: unknown[]) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token || !to) return;
  await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ to, messages }),
  }).catch((e) => console.error("line-push-failed", e));
}

export async function GET(req: Request, { params }: { params: Promise<{ sid: string }> }) {
  try {
    const { sid } = await params;
    const { searchParams } = new URL(req.url);
    if (searchParams.get("pickupSlots") === "1") {
      const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
      const slots = await getPickupSlotCounts(sid, date);
      return NextResponse.json({
        date,
        start: "08:30",
        end: "14:00",
        intervalMinutes: 15,
        limitPerSlot: 8,
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
      }))
      .filter((it) => it.menuItemId && Number.isFinite(it.quantity) && it.quantity > 0);

    if (items.length === 0) return NextResponse.json({ error: "invalid items" }, { status: 400 });

    const order = await createOrder(sid, uid, pickupTimeVal, note, items);
    
    try {
      const shop = await getShop(sid);
      const to = shop?.line_recipient_id ? String(shop.line_recipient_id).trim() : "";
      if (to) {
        const full = await getOrderForShop(order.id, sid);
        const pickup = full?.pickup_time
          ? new Date(full.pickup_time as string).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
          : "ASAP";
        const noteText = full?.note ? String(full.note) : "-";
        const total = typeof full?.total_amount === "number" ? full.total_amount : Number(full?.total_amount || 0);
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
                contents: (full?.items as { id?: string; name?: string; quantity?: number; price?: number }[]).map((it) => ({
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: `${Number(it.quantity || 0)}x`, size: "sm", color: "#111111", flex: 1 },
                    { type: "text", text: String(it.name || "Item"), size: "sm", color: "#555555", flex: 4, wrap: true }
                  ]
                }))
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
                  { type: "text", text: pickup, size: "sm", color: "#111111", align: "end" }
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
        await sendLinePush(to, [
          { type: "text", text: `New order received\nOrder ID: ${String(order.id).slice(0, 8)}\nPickup Time: ${pickup}` },
          { type: "flex", altText: `Order #${String(order.id).slice(0, 8)} pending`, contents: flexContents }
        ]);
      }
    } catch (e) {
      console.error("Failed to send LINE notification for new order", e);
    }
    
    return NextResponse.json(order, { status: 201 });
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

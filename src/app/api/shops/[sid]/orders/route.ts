import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/token";
import { createOrder, getOrderForShop, getOrders, getPickupSlotCounts, getShop } from "@/lib/db";

export const runtime = "nodejs";

async function sendLinePush(to: string, messages: unknown[]) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error("missing-line-channel-access-token");
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ to, messages }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`line-push-failed:${res.status}:${text.slice(0, 400)}`);
  }
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
    if (typeof pickupTime !== "string" || !pickupTime) {
      return NextResponse.json({ error: "pickupTime required" }, { status: 400 });
    }
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

    const order = await createOrder(sid, uid, pickupTime, note, items);
    try {
      const shop = await getShop(sid);
      const to = shop?.line_recipient_id ? String(shop.line_recipient_id).trim() : "";
      if (to) {
        const full = await getOrderForShop(order.id, sid);
        const itemLines = Array.isArray(full?.items)
          ? (full.items as { name?: string; quantity?: number }[])
              .map((it) => `${it?.name ?? "Item"} x${it?.quantity ?? 0}`)
              .join("\n")
          : "";
        const pickup = full?.pickup_time ? new Date(full.pickup_time as string).toLocaleString() : "";
        const noteText = full?.note ? String(full.note) : "";
        const total = typeof full?.total_amount === "number" ? full.total_amount : Number(full?.total_amount || 0);
        const text = [
          `New order: ${order.id}`,
          pickup ? `Pickup: ${pickup}` : null,
          itemLines ? `Items:\n${itemLines}` : null,
          noteText ? `Note: ${noteText}` : null,
          `Total: ${Number.isFinite(total) ? total.toFixed(2) : String(total)}`,
        ]
          .filter(Boolean)
          .join("\n");

        await sendLinePush(to, [
          { type: "text", text },
          {
            type: "template",
            altText: `Order ${order.id}`,
            template: {
              type: "buttons",
              text: "Update order status",
              actions: [
                { type: "postback", label: "Accept Order", data: `shopId=${encodeURIComponent(sid)}&orderId=${encodeURIComponent(order.id)}&status=accepted` },
                { type: "postback", label: "Preparing", data: `shopId=${encodeURIComponent(sid)}&orderId=${encodeURIComponent(order.id)}&status=preparing` },
                { type: "postback", label: "Ready to Pick Up", data: `shopId=${encodeURIComponent(sid)}&orderId=${encodeURIComponent(order.id)}&status=ready` },
              ],
            },
          },
        ]);
      }
    } catch (e) {
      console.error("LINE notify failed:", e);
    }
    return NextResponse.json(order, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create order";
    if (message === "slot-full") return NextResponse.json({ error: "slot-full" }, { status: 409 });
    if (message === "out-of-stock") return NextResponse.json({ error: "out-of-stock" }, { status: 409 });
    if (message === "invalid-item") return NextResponse.json({ error: "invalid-item" }, { status: 400 });
    if (message === "invalid-quantity") return NextResponse.json({ error: "invalid-quantity" }, { status: 400 });
    console.error("Error creating order:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/token";
import { updateOrderStatusForUser, getOrder, getShop, getOrderForShop } from "@/lib/db";

export const runtime = "nodejs";

async function sendLinePush(to: string, messages: unknown[]) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return; // Silent fail if no token
  await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ to, messages }),
  }).catch((e) => console.error("Line push failed:", e));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ oid: string }> }
) {
  try {
    const { oid } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value || cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyAccessToken(token);
    const uid = payload && typeof payload === "object" && "uid" in payload ? String(payload.uid) : null;
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const current = await getOrder(oid);
    if (!current || current.user_id !== uid) {
      return NextResponse.json({ error: "Order not found or access denied" }, { status: 404 });
    }
    const status = String(current.status || "").trim().toLowerCase();
    if (status !== "accepted") {
      return NextResponse.json({ error: "not-accepted" }, { status: 409 });
    }
    if (current.receipt_url) {
      return NextResponse.json({ error: "already paid" }, { status: 409 });
    }

    const out = await updateOrderStatusForUser(oid, uid, "preparing");
    if (!out.updated) {
      return NextResponse.json({ error: "Order not found or access denied" }, { status: 404 });
    }

    const order = await getOrder(oid);
    if (order?.shop_id) {
      const shop = await getShop(order.shop_id);
      const to = shop?.line_recipient_id ? String(shop.line_recipient_id).trim() : "";
      if (to) {
        const full = await getOrderForShop(oid, String(order.shop_id));
        const pickup = full?.pickup_time ? new Date(full.pickup_time as string).toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit' }) : "ASAP";
        const noteText = full?.note ? String(full.note) : "-";
        const total = typeof full?.total_amount === "number" ? full.total_amount : Number(full?.total_amount || 0);
        const flexContents = {
          type: "bubble",
          header: {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "💰 Paid Order Received", weight: "bold", color: "#1DB446", size: "sm" },
              { type: "text", text: `#${String(oid).slice(0, 8)}`, weight: "bold", size: "xl", margin: "md" }
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
              }] : [])
            ]
          }
        };
        await sendLinePush(to, [
          { type: "text", text: `New paid order received\nOrder ID: ${String(oid).slice(0, 8)}\nPickup Time: ${pickup}` },
          { type: "flex", altText: `Paid Order #${String(oid).slice(0, 8)}`, contents: flexContents }
        ]);
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error confirming payment:", error);
    return NextResponse.json({ error: "Failed to confirm payment" }, { status: 500 });
  }
}

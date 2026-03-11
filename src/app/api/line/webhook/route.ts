import crypto from "crypto";
import { NextResponse } from "next/server";
import { getOrder, getUser, updateOrderStatusForShop } from "@/lib/db";
import { buildOrderStatusEmail, sendEmail } from "@/lib/email";

export const runtime = "nodejs";

const allowedStatuses = new Set(["accepted", "preparing", "ready", "completed", "cancelled"]);

function getString(o: Record<string, unknown> | null, key: string) {
  const v = o?.[key];
  return typeof v === "string" ? v : "";
}

function getObj(o: Record<string, unknown> | null, key: string) {
  const v = o?.[key];
  if (!v || typeof v !== "object") return null;
  return v as Record<string, unknown>;
}

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

async function replyLine(replyToken: string, text: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("missing-line-channel-access-token");
  const res = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`line-reply-failed:${res.status}:${body.slice(0, 400)}`);
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const secret = process.env.LINE_CHANNEL_SECRET?.trim();
  console.log("LINE Webhook called");
  if (!secret) {
    console.error("Missing LINE_CHANNEL_SECRET");
    return NextResponse.json({ error: "missing line channel secret" }, { status: 500 });
  }

  const signature = (req.headers.get("x-line-signature") || "").trim();
  const raw = await req.text();
  console.log("LINE Webhook signature:", signature);
  // console.log("LINE Webhook body:", raw); // Uncomment if needed

  const expected = crypto.createHmac("sha256", secret).update(raw).digest("base64");
  if (!signature || !safeEqual(signature, expected)) {
    console.error("Invalid signature. Expected:", expected, "Got:", signature);
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {
    console.error("Failed to parse JSON body");
    return NextResponse.json({ ok: true });
  }

  const events = (body as { events?: unknown })?.events;
  if (!Array.isArray(events)) return NextResponse.json({ ok: true });

  for (const rawEv of events as unknown[]) {
    const ev = rawEv && typeof rawEv === "object" ? (rawEv as Record<string, unknown>) : null;
    const replyToken = getString(ev, "replyToken");
    const type = getString(ev, "type");
    const userId = getString(getObj(ev, "source"), "userId");
    console.log("LINE User ID:", userId);
    console.log("Processing event:", type);

    try {
      if (type === "follow" && replyToken) {
        const userId = getString(getObj(ev, "source"), "userId");
        console.log("Follow event, userId:", userId);
        if (userId) {
          await replyLine(replyToken, `Your LINE Recipient ID is:\n${userId}`);
        }
        continue;
      }

      if (type !== "postback" || !replyToken) continue;
      const data = getString(getObj(ev, "postback"), "data");
      console.log("Postback data:", data);
      const params = new URLSearchParams(data);
      const shopId = (params.get("shopId") || "").trim();
      const orderId = (params.get("orderId") || "").trim();
      const status = (params.get("status") || "").trim().toLowerCase();
      
      console.log(`Updating order ${orderId} for shop ${shopId} to ${status}`);

      if (!shopId || !orderId || !allowedStatuses.has(status)) {
        await replyLine(replyToken, "Invalid action");
        continue;
      }

      const out = await updateOrderStatusForShop(orderId, shopId, status);
      console.log("Update result:", out);
      if (!out.updated) {
        await replyLine(replyToken, "Order not found or status already updated.");
        continue;
      }

      try {
        const order = await getOrder(orderId);
        if (order?.user_id) {
          const user = await getUser(String(order.user_id));
          if (user?.email) {
            const payload = buildOrderStatusEmail({
              orderId,
              status,
              totalAmount: order?.total_amount ?? null,
            });
            if (payload) {
              sendEmail(user.email, payload.subject, payload.html).catch(e => console.error("Email send error", e));
            }
          }
        }
      } catch (e) {
        console.error("Failed to send email notification", e);
      }

      if (status === "accepted") {
        await replyLine(replyToken, "✅ Order Accepted!\nWaiting for user payment.");
      } else if (status === "preparing") {
        await replyLine(replyToken, "✅ Status updated to [Preparing].\nPlease start cooking 🍳");
      } else if (status === "cancelled") {
        await replyLine(replyToken, "❌ Order Rejected.\nStatus updated to [Cancelled].");
      } else {
        await replyLine(replyToken, `Updated order ${orderId.slice(0, 8)} to ${status}`);
      }
    } catch (e) {
      console.error("LINE webhook error:", e);
      try {
        if (replyToken) await replyLine(replyToken, "Failed to update order");
      } catch {}
    }
  }

  return NextResponse.json({ ok: true });
}

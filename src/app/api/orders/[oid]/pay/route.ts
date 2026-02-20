import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/token";
import { getOrder, getShop, getOrderForShop } from "@/lib/db";

export const runtime = "nodejs";

async function sendLinePush(to: string, messages: unknown[]) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
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

function formatBangkokTime(value: unknown) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
  }
  const raw = String(value).trim();
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(raw);
  const looksLikeDateTime = /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/.test(raw);
  const normalized = !hasZone && looksLikeDateTime ? `${raw.replace(" ", "T")}+07:00` : raw;
  const d = new Date(normalized);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
  }
  const t = raw.includes("T") ? raw.split("T")[1] : raw;
  return t.slice(0, 5);
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
 
    if (current?.shop_id) {
      const shop = await getShop(String(current.shop_id));
      const to = shop?.line_recipient_id ? String(shop.line_recipient_id).trim() : "";
      if (to) {
        const full = await getOrderForShop(oid, String(current.shop_id));
        const pickup = full?.pickup_time ? formatBangkokTime(full.pickup_time) : "ASAP";
        await sendLinePush(to, [
          { type: "text", text: `💰 Payment recorded\nOrder #${String(oid).slice(0, 8)}\nPickup: ${pickup}\n⏰ Reminder: We will message you shortly before pickup to start preparing.` }
        ]);
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error confirming payment:", error);
    return NextResponse.json({ error: "Failed to confirm payment" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/token";
import { attachOrderReceipt, getOrder, getShop, pool } from "@/lib/db";
export const runtime = "nodejs";

async function sendLinePush(to: string, messages: unknown[]) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
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

export async function POST(
  req: Request,
  { params }: { params: Promise<{ oid: string }> }
) {
  try {
    const { oid } = await params;
    const body = await req.json().catch(() => ({}));
    const imageUrl: string | null = body?.imageUrl ? String(body.imageUrl) : null;
    const reference: string | null = body?.reference ? String(body.reference).trim() : null;
    const amountRaw = body?.amount;
    const amount = typeof amountRaw === "number" ? amountRaw : undefined;

    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value || cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyAccessToken(token);
    const uid = payload && typeof payload === "object" && "uid" in payload ? String(payload.uid) : null;
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Guard against duplicate submissions
    const existing = await getOrder(oid);
    if (!existing || existing.user_id !== uid) {
      return NextResponse.json({ error: "Order not found or access denied" }, { status: 404 });
    }
    if (existing.receipt_url) {
      return NextResponse.json({ error: "receipt already submitted" }, { status: 409 });
    }
    const currentStatus = String(existing.status || "").trim().toLowerCase();
    if (currentStatus !== "accepted") {
      return NextResponse.json({ error: "not-accepted" }, { status: 409 });
    }
    await attachOrderReceipt(oid, uid, imageUrl, reference);

    // Notify shop owner via LINE, if configured
    const order = await getOrder(oid);
    const sid = order?.shop_id ? String(order.shop_id) : "";
    if (sid) {
      const shop = await getShop(sid);
      const to = shop?.line_recipient_id ? String(shop.line_recipient_id).trim() : "";
      if (to) {
        const slotRes = await pool.query("select to_char(pickup_time, 'HH24:MI') as slot from orders where id = $1", [oid]);
        const pickupSlot = String(slotRes.rows[0]?.slot || "").trim();
        const lines = [
          `📄 Transfer Receipt Submitted`,
          `Order #${oid.slice(0, 8)}${amount ? ` · ฿${amount}` : ""}`,
          reference ? `Ref: ${reference}` : undefined,
          pickupSlot ? `Pickup: ${pickupSlot}` : undefined,
          `⏰ Reminder: We will message you 10–15 minutes before pickup to start preparing.`,
        ].filter(Boolean);
        const messages: unknown[] = [
          { type: "text", text: (lines as string[]).join("\n") },
        ];
        // Ensure absolute HTTPS URL for LINE
        const baseRaw = process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "";
        const base = baseRaw.trim().replace(/\/+$/, "");
        const imageAbs =
          imageUrl && imageUrl.startsWith("/") && base ? `${base}${imageUrl}` : imageUrl;
        if (imageAbs) {
          messages.push({
            type: "image",
            originalContentUrl: imageAbs,
            previewImageUrl: imageAbs,
          });
        }
        await sendLinePush(to, messages);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error submitting receipt:", error);
    return NextResponse.json({ error: "Failed to submit receipt" }, { status: 500 });
  }
}

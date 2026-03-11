import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/token";
import { getShop, updateOrderStatusForShop, getOrder, getUser } from "@/lib/db";
import { buildOrderStatusEmail, sendEmail } from "@/lib/email";

const allowedStatuses = new Set(["pending", "accepted", "preparing", "ready", "completed", "cancelled"]);

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ sid: string; oid: string }> }
) {
  try {
    const { sid, oid } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value || cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyAccessToken(token);
    const uid = payload && typeof payload === "object" && "uid" in payload ? String(payload.uid) : null;
    const role = payload && typeof payload === "object" && "role" in payload ? String(payload.role) : null;
    const normalizedRole = role ? role.trim().toLowerCase() : "";
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (normalizedRole !== "owner" && normalizedRole !== "shop" && normalizedRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (normalizedRole === "owner" || normalizedRole === "shop") {
      const shop = await getShop(sid);
      if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });
      const linkedUser = await getUser(uid);
      const isOwnerByShopOwnerUid = shop.owner_uid === uid;
      const isOwnerByUserShopLink = linkedUser?.shop_id === sid;
      if (!isOwnerByShopOwnerUid && !isOwnerByUserShopLink) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await req.json();
    const { status } = body;

    if (!status || typeof status !== "string") {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }
    const normalized = status.trim().toLowerCase();
    if (!allowedStatuses.has(normalized)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const out = await updateOrderStatusForShop(oid, sid, normalized);
    if (!out.updated) {
      const reason = typeof out === "object" && out && "reason" in out ? String(out.reason || "") : "";
      if (reason === "already-updated") {
        return NextResponse.json({ success: true, alreadyUpdated: true });
      }
      if (reason === "invalid-transition") {
        const currentStatus = typeof out === "object" && out && "currentStatus" in out ? String(out.currentStatus || "") : "";
        return NextResponse.json({ error: "invalid-transition", currentStatus }, { status: 409 });
      }
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    
    // Send email notification to customer
    try {
      const order = await getOrder(oid);
      if (order && order.user_id) {
        const user = await getUser(order.user_id);
        if (user && user.email) {
          const payload = buildOrderStatusEmail({
            orderId: oid,
            status: normalized,
            totalAmount: order?.total_amount ?? null,
          });
          if (payload) {
            sendEmail(user.email, payload.subject, payload.html).catch(e => console.error("Email send error", e));
          }
        }
      }
    } catch (e) {
      console.error("Failed to prepare email notification", e);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}

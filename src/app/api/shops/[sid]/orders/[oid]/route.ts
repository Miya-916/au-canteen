import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/token";
import { getShop, updateOrderStatusForShop, getOrder, getUser } from "@/lib/db";
import { sendLinePush, formatBangkokTime } from "@/lib/line";
import { sendEmail } from "@/lib/email";

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
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (role !== "owner" && role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (role === "owner") {
      const shop = await getShop(sid);
      if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });
      if (shop.owner_uid !== uid) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
          let subject = "";
          let text = "";
          const orderIdShort = oid.slice(0, 8);

          if (normalized === "preparing") {
            subject = `Order #${orderIdShort} is Preparing 🍳`;
            text = `Your order #${orderIdShort} is now being prepared. We will notify you when it is ready for pickup.`;
          } else if (normalized === "ready") {
             subject = `Order #${orderIdShort} is Ready for Pickup! 🥡`;
             text = `Your order #${orderIdShort} is ready! Please come to pick it up at the shop.`;
          } else if (normalized === "completed") {
             subject = `Order #${orderIdShort} Completed ✅`;
             text = `Thank you for your order! Enjoy your meal.`;
          } else if (normalized === "cancelled") {
             subject = `Order #${orderIdShort} Cancelled ❌`;
             text = `Your order #${orderIdShort} has been cancelled by the shop.`;
          }

          if (subject && text) {
             const html = `
               <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                 <h2 style="color: #333;">${subject}</h2>
                 <p style="font-size: 16px; color: #555;">${text}</p>
                 <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                 <p style="color: #999; font-size: 12px;">AU Canteen System</p>
               </div>
             `;
             // Run in background so we don't block the response
             sendEmail(user.email, subject, html).catch(e => console.error("Email send error", e));
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

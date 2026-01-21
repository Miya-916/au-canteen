import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/token";
import { getShop, updateOrderStatusForShop } from "@/lib/db";

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
    if (!out.updated) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}

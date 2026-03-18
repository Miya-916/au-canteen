import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/token";
import { expireOverdueOrder, getOrder } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
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
    await expireOverdueOrder(oid);
    const latest = await getOrder(oid);
    if (!latest || latest.user_id !== uid) {
      return NextResponse.json({ error: "Order not found or access denied" }, { status: 404 });
    }
    const status = String(latest.status || "").trim().toLowerCase();
    if (status === "expired") {
      return NextResponse.json({ error: "payment-expired" }, { status: 409 });
    }
    if (status !== "accepted") {
      return NextResponse.json({ error: "not-accepted" }, { status: 409 });
    }
    if (latest.receipt_url) {
      return NextResponse.json({ error: "already paid" }, { status: 409 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error confirming payment:", error);
    return NextResponse.json({ error: "Failed to confirm payment" }, { status: 500 });
  }
}

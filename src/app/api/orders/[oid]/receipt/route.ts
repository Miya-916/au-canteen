import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/token";
import { attachOrderReceipt, expireOverdueOrder, getOrder } from "@/lib/db";
export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ oid: string }> }
) {
  try {
    const { oid } = await params;
    const body = await req.json().catch(() => ({}));
    const imageUrl: string | null = body?.imageUrl ? String(body.imageUrl) : null;
    const reference: string | null = body?.reference ? String(body.reference).trim() : null;

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
    await expireOverdueOrder(oid);
    const latest = await getOrder(oid);
    if (!latest || latest.user_id !== uid) {
      return NextResponse.json({ error: "Order not found or access denied" }, { status: 404 });
    }
    const currentStatus = String(latest.status || "").trim().toLowerCase();
    if (currentStatus === "expired") {
      return NextResponse.json({ error: "payment-expired" }, { status: 409 });
    }
    if (latest.receipt_url) {
      return NextResponse.json({ error: "receipt already submitted" }, { status: 409 });
    }
    if (currentStatus !== "accepted") {
      return NextResponse.json({ error: "not-accepted" }, { status: 409 });
    }
    await attachOrderReceipt(oid, uid, imageUrl, reference);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error submitting receipt:", error);
    return NextResponse.json({ error: "Failed to submit receipt" }, { status: 500 });
  }
}

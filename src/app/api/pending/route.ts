import { NextResponse } from "next/server";
import { listPendingUpdates, createPendingUpdate } from "@/lib/db";

// Force rebuild
export const runtime = "nodejs";

export async function GET() {
  const rows = await listPendingUpdates();
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sid, changes, requested_by, reason } = body || {};
    if (!sid || !changes || typeof changes !== "object") {
      return NextResponse.json({ error: "invalid-request" }, { status: 400 });
    }
    const row = await createPendingUpdate(sid, changes, requested_by || null, reason || null);
    return NextResponse.json(row);
  } catch (e) {
    const msg = typeof e === "object" && e && "message" in e ? (e as { message?: string }).message || String(e) : String(e);
    return NextResponse.json({ error: msg || "server-error" }, { status: 500 });
  }
}

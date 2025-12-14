import { NextResponse } from "next/server";
import { listPendingUpdates } from "@/lib/db";

// Force rebuild
export const runtime = "nodejs";

export async function GET() {
  const rows = await listPendingUpdates();
  return NextResponse.json(rows);
}

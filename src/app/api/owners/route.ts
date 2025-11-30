import { NextResponse } from "next/server";
import { listOwners } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const rows = await listOwners();
  return NextResponse.json(rows);
}

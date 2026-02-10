import { NextResponse } from "next/server";
import { getShopReports } from "@/lib/db";

export const runtime = "nodejs";

function toDateOnly(d: Date) {
  return d.toISOString().split("T")[0];
}

export async function GET(req: Request, { params }: { params: Promise<{ sid: string }> }) {
  try {
    const { sid } = await params;
    const url = new URL(req.url);
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");
    const today = new Date();
    const to = toParam || toDateOnly(today);
    const from = fromParam || toDateOnly(new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000));
    const data = await getShopReports(sid, from, to);
    return NextResponse.json({ range: { from, to }, ...data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch reports";
    console.error("Error fetching reports:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

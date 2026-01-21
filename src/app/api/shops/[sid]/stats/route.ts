import { NextResponse } from "next/server";
import { getShopStats, getNewOrdersCount } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ sid: string }> }) {
  const { sid } = await params;
  try {
    const stats = await getShopStats(sid);
    const newOrders = await getNewOrdersCount(sid);
    return NextResponse.json({ ...stats, newOrders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch stats";
    console.error("Error fetching stats:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

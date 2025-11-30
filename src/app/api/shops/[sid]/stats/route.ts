import { NextResponse } from "next/server";
import { getShopStats, getNewOrdersCount } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ sid: string }> }) {
  const { sid } = await params;
  try {
    const stats = await getShopStats(sid);
    const newOrders = await getNewOrdersCount(sid);
    return NextResponse.json({ ...stats, newOrders });
  } catch (error: any) {
    console.error("Error fetching stats:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch stats" }, { status: 500 });
  }
}

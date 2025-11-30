import { NextResponse } from "next/server";
import { updateOrderStatus } from "@/lib/db";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ sid: string; oid: string }> }
) {
  try {
    const { sid, oid } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    await updateOrderStatus(oid, status);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { approvePendingUpdate, rejectPendingUpdate, markPendingUpdateReadByOwner, markPendingUpdateUpdated } from "@/lib/db";

export const runtime = "nodejs";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const action = (body?.action || "").toLowerCase();
    if (action === "approve") {
      const res = await approvePendingUpdate(id);
      return NextResponse.json(res);
    }
    if (action === "reject") {
      const res = await rejectPendingUpdate(id);
      return NextResponse.json(res);
    }
    if (action === "updated") {
      const res = await markPendingUpdateUpdated(id);
      return NextResponse.json(res);
    }
    if (action === "read") {
      const res = await markPendingUpdateReadByOwner(id);
      return NextResponse.json(res);
    }
    return NextResponse.json({ error: "invalid-action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "server-error" }, { status: 500 });
  }
}

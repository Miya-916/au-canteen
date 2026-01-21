import { NextResponse } from "next/server";
import { bulkUpdateMenuStock } from "@/lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ sid: string }> }) {
  try {
    const body = await req.json();
    const { ids, stock } = body;

    if (!ids || !Array.isArray(ids) || stock === undefined) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    await bulkUpdateMenuStock(ids, parseInt(stock));
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to bulk update";
    console.error("Error bulk updating menu items:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

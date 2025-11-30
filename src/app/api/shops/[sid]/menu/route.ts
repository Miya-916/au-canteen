import { NextResponse } from "next/server";
import { getMenuItems, createMenuItem } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ sid: string }> }) {
  try {
    const { sid } = await params;
    const items = await getMenuItems(sid);
    return NextResponse.json(items || []);
  } catch (error) {
    console.error("Error fetching menu items:", error);
    return NextResponse.json({ error: "Failed to fetch menu items" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ sid: string }> }) {
  const { sid } = await params;
  try {
    const body = await req.json();
    const { name, price, stock, imageUrl, category } = body;

    if (!name || price === undefined || stock === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newItem = await createMenuItem(sid, name, parseFloat(price), parseInt(stock), imageUrl || null, category || null);
    return NextResponse.json(newItem);
  } catch (error: any) {
    console.error("Error creating menu item:", error);
    return NextResponse.json({ error: error.message || "Failed to create menu item" }, { status: 500 });
  }
}

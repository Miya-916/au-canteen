import { NextResponse } from "next/server";
import { updateMenuItem, deleteMenuItem } from "@/lib/db";

export async function PUT(req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  try {
    const body = await req.json();
    const { name, price, stock, imageUrl, category } = body;

    if (!name || price === undefined || stock === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const updatedItem = await updateMenuItem(itemId, name, parseFloat(price), parseInt(stock), imageUrl || null, category || null);
    return NextResponse.json(updatedItem);
  } catch (error: any) {
    console.error("Error updating menu item:", error);
    return NextResponse.json({ error: error.message || "Failed to update menu item" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  try {
    await deleteMenuItem(itemId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting menu item:", error);
    return NextResponse.json({ error: "Failed to delete menu item" }, { status: 500 });
  }
}

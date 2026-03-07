import { NextResponse } from "next/server";
import { getMenuItems, createMenuItem, getShop } from "@/lib/db";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/token";

export async function GET(req: Request, { params }: { params: Promise<{ sid: string }> }) {
  try {
    const { sid } = await params;
    
    // Check if user is owner of this shop
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value || cookieStore.get("token")?.value;
    let isOwner = false;
    if (token) {
      const payload = verifyAccessToken(token);
      if (payload && typeof payload === "object" && payload.role === "owner" && payload.uid) {
         const shop = await getShop(sid);
         if (shop && shop.owner_uid === payload.uid) {
           isOwner = true;
         }
      }
    }

    const items = await getMenuItems(sid, !isOwner);
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
    const { name, price, stock, imageUrl, category, id, isActive } = body;

    if (!name || price === undefined || stock === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newItem = await createMenuItem(
      sid, 
      name, 
      parseFloat(price), 
      parseInt(stock), 
      imageUrl || null, 
      category || null, 
      id,
      isActive !== undefined ? Boolean(isActive) : true
    );
    return NextResponse.json(newItem);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create menu item";
    console.error("Error creating menu item:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

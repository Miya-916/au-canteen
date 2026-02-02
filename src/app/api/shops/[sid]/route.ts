import { NextResponse } from "next/server";
import { getShop, updateShop, deleteShop, getUserByEmail, createUserLocal, setRoleByEmail } from "@/lib/db";
// @ts-expect-error bcrypt types
import bcrypt from "bcryptjs";
export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ sid: string }> }) {
  const { sid } = await params;
  const shop = await getShop(sid);
  if (!shop) {
    try {
      const { listShops } = await import("@/lib/db");
      const rows = (await listShops()) as { sid: string }[];
      const found = rows.find((r) => r.sid === sid);
      if (found) return NextResponse.json(found);
      return NextResponse.json({ error: "not found" }, { status: 404 });
    } catch {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
  }
  return NextResponse.json(shop);
}

export async function PUT(req: Request, { params }: { params: Promise<{ sid: string }> }) {
  const { sid } = await params;
  try {
    const currentShop = await getShop(sid);
    if (!currentShop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const body = await req.json();
    
    // Extract fields with fallbacks to current values
    // Supports both camelCase and snake_case
    const name = body.name ?? currentShop.name;
    const statusRaw = body.status ?? currentShop.status;
    const phone = body.phone ?? currentShop.phone;
    const address = body.address ?? currentShop.address;
    const lineId = body.lineId ?? body.line_id ?? currentShop.line_id;
    const lineRecipientId = body.lineRecipientId ?? body.line_recipient_id ?? currentShop.line_recipient_id ?? null;
    const cuisine = body.cuisine ?? currentShop.cuisine;
    const openDate = body.openDate ?? body.open_date ?? currentShop.open_date;
    const category = body.category ?? currentShop.category;
    const ownerName = body.ownerName ?? body.owner_name ?? currentShop.owner_name;
    const imageUrl = body.imageUrl ?? currentShop.image_url ?? null;
    const qrUrl = body.qrUrl ?? body.qr_url ?? currentShop.qr_url ?? null;
    
    const status = statusRaw ? statusRaw.trim().toLowerCase() : undefined;

    // Handle Owner/User Logic
    const ownerEmailRaw = body.ownerEmail ?? body.email;
    const ownerPassword = body.ownerPassword;
    
    let ownerUid = currentShop.owner_uid;
    let ownerEmail = currentShop.email;

    // Only process user logic if a NEW email is provided
    if (ownerEmailRaw && ownerEmailRaw.trim().toLowerCase() !== (currentShop.email || "").toLowerCase()) {
      const newEmail = ownerEmailRaw.trim().toLowerCase();
      let user = await getUserByEmail(newEmail);
      
      if (!user) {
        if (!ownerPassword) {
            return NextResponse.json({ error: "owner password required for new user" }, { status: 400 });
        }
        const hash = await bcrypt.hash(ownerPassword, 10);
        user = await createUserLocal(newEmail, hash, "owner");
      } else {
        await setRoleByEmail(newEmail, "owner");
      }
      
      ownerUid = user.uid;
      ownerEmail = newEmail;
    }
    
    await updateShop(
      sid, 
      name, 
      status, 
      ownerUid, 
      ownerName, 
      cuisine, 
      openDate, 
      ownerEmail, 
      phone, 
      lineId, 
      lineRecipientId,
      address, 
      category,
      imageUrl,
      qrUrl
    );
    const out = await getShop(sid);
    return NextResponse.json(out);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update shop";
    console.error("Error updating shop:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ sid: string }> }) {
  const { sid } = await params;
  await deleteShop(sid);
  return NextResponse.json({ success: true });
}

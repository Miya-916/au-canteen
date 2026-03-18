import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getShop, updateShop, deleteShop, getUserByEmail, createUserLocal, setRoleByEmail, listShops } from "@/lib/db";
// @ts-expect-error bcrypt types
import bcrypt from "bcryptjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function revalidateShopViews() {
  revalidatePath("/user");
  revalidatePath("/admin");
  revalidatePath("/admin/shops");
  revalidatePath("/user/favorites");
}

export async function GET(_: Request, { params }: { params: Promise<{ sid: string }> }) {
  const { sid } = await params;
  const shop = await getShop(sid);
  if (!shop) {
    try {
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
    const cuisine = body.cuisine ?? currentShop.cuisine;
    const openDate = body.openDate ?? body.open_date ?? currentShop.open_date;
    const category = body.category ?? currentShop.category;
    const ownerName = body.ownerName ?? body.owner_name ?? currentShop.owner_name;
    const imageUrl = body.imageUrl ?? currentShop.image_url ?? null;
    const qrUrl = body.qrUrl ?? body.qr_url ?? currentShop.qr_url ?? null;
    
    const status = statusRaw ? statusRaw.trim().toLowerCase() : undefined;
    const normalizedAddress = String(address || "").trim().toLowerCase();
    const allShops = await listShops();
    const conflictingShop = allShops.find(
      (shop) =>
        shop.sid !== sid &&
        String(shop.address || "").trim().toLowerCase() === normalizedAddress
    );
    if (conflictingShop) {
      return NextResponse.json({ error: "This stall location is already assigned to another shop" }, { status: 409 });
    }

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
        if (typeof ownerPassword === "string" && ownerPassword.length < 6) {
          return NextResponse.json({ error: "password too short" }, { status: 400 });
        }
        const hash = await bcrypt.hash(ownerPassword, 10);
        user = await createUserLocal(newEmail, hash, "owner");
      } else {
        await setRoleByEmail(newEmail, "owner");
      }
      
      ownerUid = user.uid;
      ownerEmail = newEmail;
    }
    
    // Ensure the assigned owner email is promoted to owner role even if unchanged
    if (ownerEmail) {
      const normalizedEmail = ownerEmail.trim().toLowerCase();
      const existing = await getUserByEmail(normalizedEmail);
      if (existing && existing.role !== "owner" && existing.role !== "shop") {
        await setRoleByEmail(normalizedEmail, "owner");
      }
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
      address, 
      category,
      imageUrl,
      qrUrl
    );
    revalidateShopViews();
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
  try {
    await deleteShop(sid);
    revalidateShopViews();
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Delete shop error:", error);
    const msg = error instanceof Error ? error.message : "Failed to delete shop";
    // Check for foreign key violation
    if (msg.includes("foreign key constraint") || msg.includes("violates foreign key")) {
      return NextResponse.json({ error: "Cannot delete shop because it has active orders or menu items. Please clear data first." }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { listShops, createShop, getUserByEmail, createUserLocal, setRoleByEmail, getShopByOwnerUid } from "@/lib/db";
// @ts-expect-error bcrypt types
import bcrypt from "bcryptjs";
export const runtime = "nodejs";

export async function GET() {
  const rows = await listShops();
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const name: string | undefined = body?.name;
  const statusRaw: string | undefined = body?.status;
  const ownerEmailRaw: string | undefined = body?.ownerEmail;
  const ownerPassword: string | undefined = body?.ownerPassword;
  const ownerName: string | undefined = body?.ownerName;
  const cuisine: string | undefined = body?.cuisine;
  const openDate: string | undefined = body?.openDate;
  const phone: string | undefined = body?.phone;
  const lineId: string | undefined = body?.lineId;
  const lineRecipientId: string | undefined = body?.lineRecipientId ?? body?.line_recipient_id;
  const address: string | undefined = body?.address;
  const category: string | undefined = body?.category;
  const imageUrl: string | undefined = body?.imageUrl;
  const qrUrl: string | undefined = body?.qrUrl ?? body?.qr_url;
  const loginType: string | undefined = body?.loginType;
  const status = statusRaw ? statusRaw.trim().toLowerCase() : undefined;
  const ownerEmail = ownerEmailRaw ? ownerEmailRaw.trim().toLowerCase() : undefined;
  
  if (!name || !status || !phone || !lineId || !address) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  let loginIdentifier = ownerEmail;
  if (loginType === "phone" && phone) {
    loginIdentifier = phone;
  }

  if (loginIdentifier) {
    let user = await getUserByEmail(loginIdentifier);
    if (!user) {
      if (!ownerPassword) return NextResponse.json({ error: "owner password required" }, { status: 400 });
      const hash = await bcrypt.hash(ownerPassword, 10);
      user = await createUserLocal(loginIdentifier, hash, "owner");
    } else {
      const existingShop = await getShopByOwnerUid(user.uid);
      if (existingShop) {
        return NextResponse.json({ error: "Account already associated with another shop" }, { status: 400 });
      }
      await setRoleByEmail(loginIdentifier, "owner");
    }
    const shop = await createShop(
      name,
      status,
      user.uid,
      ownerName || null,
      cuisine || null,
      openDate || null,
      ownerEmail ?? null,
      phone,
      lineId,
      lineRecipientId ?? null,
      address,
      category || null,
      imageUrl ?? null,
      qrUrl ?? null
    );
    return NextResponse.json(shop, { status: 201 });
  } else {
    const shop = await createShop(name, status, null, ownerName || null, cuisine || null, openDate || null, null, phone, lineId, lineRecipientId ?? null, address, category || null, imageUrl ?? null, qrUrl ?? null);
    return NextResponse.json(shop, { status: 201 });
  }
}

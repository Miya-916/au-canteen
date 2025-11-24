import { NextResponse } from "next/server";
import { listShops, createShop, getUserByEmail, createUserLocal, setRoleByEmail } from "@/lib/db";
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
  const status = statusRaw ? statusRaw.trim().toLowerCase() : undefined;
  const ownerEmail = ownerEmailRaw ? ownerEmailRaw.trim().toLowerCase() : undefined;
  if (!name || !status) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  if (ownerEmail) {
    let user = await getUserByEmail(ownerEmail);
    if (!user) {
      if (!ownerPassword) return NextResponse.json({ error: "owner password required" }, { status: 400 });
      const hash = await bcrypt.hash(ownerPassword, 10);
      user = await createUserLocal(ownerEmail, hash, "owner");
    } else {
      await setRoleByEmail(ownerEmail, "owner");
    }
    const shop = await createShop(name, status, user.uid, ownerName || null, cuisine || null, openDate || null, ownerEmail);
    return NextResponse.json(shop, { status: 201 });
  } else {
    const shop = await createShop(name, status, null, ownerName || null, cuisine || null, openDate || null, null);
    return NextResponse.json(shop, { status: 201 });
  }
}
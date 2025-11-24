import { NextResponse } from "next/server";
import { getShop, updateShop, getUserByEmail, createUserLocal, setRoleByEmail } from "@/lib/db";
// @ts-expect-error bcrypt types
import bcrypt from "bcryptjs";
export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: { sid: string } }) {
  const shop = await getShop(params.sid);
  if (!shop) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(shop);
}

export async function PUT(req: Request, { params }: { params: { sid: string } }) {
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
  let ownerUid: string | null = null;
  if (ownerEmail) {
    let user = await getUserByEmail(ownerEmail);
    if (!user) {
      if (!ownerPassword) return NextResponse.json({ error: "owner password required" }, { status: 400 });
      const hash = await bcrypt.hash(ownerPassword, 10);
      user = await createUserLocal(ownerEmail, hash, "owner");
    } else {
      await setRoleByEmail(ownerEmail, "owner");
    }
    ownerUid = user.uid;
  }
  await updateShop(params.sid, name, status, ownerUid, ownerName || null, cuisine || null, openDate || null, ownerEmail || null);
  const out = await getShop(params.sid);
  return NextResponse.json(out);
}
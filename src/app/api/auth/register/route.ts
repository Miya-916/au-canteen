import { NextResponse } from "next/server";
import { createUserLocal, getUserByEmail } from "@/lib/db";
// @ts-ignore
import bcrypt from "bcryptjs";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json();
  const emailRaw: string | undefined = body?.email;
  const password: string | undefined = body?.password;
  const role: string = (body?.role as string) || "customer";
  const email = emailRaw ? emailRaw.trim().toLowerCase() : undefined;
  if (!email || !password) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const existing = await getUserByEmail(email);
  if (existing) return NextResponse.json({ error: "email exists" }, { status: 409 });
  const hash = await bcrypt.hash(password, 10);
  const user = await createUserLocal(email, hash, role);
  return NextResponse.json(user, { status: 201 });
}
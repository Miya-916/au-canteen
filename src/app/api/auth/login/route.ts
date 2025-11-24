import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db";
// @ts-expect-error bcrypt types
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { createAccessToken } from "@/lib/token";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json();
  const emailRaw: string | undefined = body?.email;
  const password: string | undefined = body?.password;
  const email = emailRaw ? emailRaw.trim().toLowerCase() : undefined;
  if (!email || !password) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const user = await getUserByEmail(email);
  if (!user) return NextResponse.json({ error: "invalid-credential" }, { status: 401 });
  const ok = !!user.password_hash && (await bcrypt.compare(password, user.password_hash));
  if (!ok) return NextResponse.json({ error: "invalid-credential" }, { status: 401 });
  const accessToken = createAccessToken({ uid: user.uid, role: user.role }, 60 * 60 * 24 * 30);
  const cookieStore = await cookies();
  cookieStore.set("access_token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return NextResponse.json({ uid: user.uid, role: user.role, accessToken });
}
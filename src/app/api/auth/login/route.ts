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
  const requestedRoleRaw: string | undefined = body?.requestedRole;
  const requestedRole = (requestedRoleRaw || "").trim().toLowerCase();
  const role = String(body?.role || "").trim().toLowerCase();
  const requiredRole = requestedRole || role;
  const email = emailRaw ? emailRaw.trim().toLowerCase() : undefined;
  if (!email || !password) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const user = await getUserByEmail(email);
  if (!user) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  const hash = typeof user.password_hash === "string" ? user.password_hash : "";
  const isBcryptHash =
    hash.startsWith("$2a$") ||
    hash.startsWith("$2b$") ||
    hash.startsWith("$2y$");
  if (!isBcryptHash) {
    return NextResponse.json(
      { error: "This account uses Google Sign-In. Use Google Sign-In or reset password to set a password for email login." },
      { status: 401 }
    );
  }
  let ok = false;
  try {
    ok = await bcrypt.compare(password, hash);
  } catch {
    ok = false;
  }
  if (!ok) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  if (user.is_active !== true || user.email_verified !== true) {
    return NextResponse.json({ error: "Please verify your email before signing in." }, { status: 403 });
  }
  const actualRole = String(user.role || "").trim().toLowerCase();
  const isOwnerRole = actualRole === "owner" || actualRole === "shop";
  const isCustomerRole = actualRole === "customer" || actualRole === "user";
  if (
    (requiredRole === "admin" && actualRole !== "admin") ||
    (requiredRole === "owner" && !isOwnerRole) ||
    (requiredRole === "customer" && !isCustomerRole)
  ) {
    return NextResponse.json({ error: "This account is not allowed for this login page." }, { status: 403 });
  }
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

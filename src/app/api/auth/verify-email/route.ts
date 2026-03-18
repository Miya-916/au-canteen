import { NextResponse } from "next/server";
import { activateUserByUid, getUser } from "@/lib/db";
import { verifyAccessToken } from "@/lib/token";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token: string | undefined = body?.token;
    if (!token) {
      return NextResponse.json({ error: "missing token" }, { status: 400 });
    }

    const payload = verifyAccessToken(token);
    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "invalid or expired token" }, { status: 400 });
    }

    const purpose = (payload as { purpose?: string }).purpose;
    const uid = (payload as { uid?: string }).uid;
    const email = (payload as { email?: string }).email;
    if (purpose !== "email_verify" || !uid || !email) {
      return NextResponse.json({ error: "invalid token" }, { status: 400 });
    }

    const user = await getUser(uid);
    if (!user) {
      return NextResponse.json({ error: "user not found" }, { status: 404 });
    }

    const userEmail = typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
    if (userEmail !== String(email).trim().toLowerCase()) {
      return NextResponse.json({ error: "invalid token" }, { status: 400 });
    }

    if (user.is_active === true && user.email_verified === true) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    const out = await activateUserByUid(uid);
    if (!out.updated) {
      return NextResponse.json({ error: "failed to activate account" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, activated: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Verify email error:", message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

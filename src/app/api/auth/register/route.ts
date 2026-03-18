import { NextResponse } from "next/server";
import { createUserLocal, getUserByEmail } from "@/lib/db";
// @ts-expect-error bcrypt types
import bcrypt from "bcryptjs";
import { sendEmail } from "@/lib/email";
import { createAccessToken } from "@/lib/token";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json();
  const emailRaw: string | undefined = body?.email;
  const password: string | undefined = body?.password;
  const role: string = (body?.role as string) || "customer";
  const email = emailRaw ? emailRaw.trim().toLowerCase() : undefined;
  if (!email || !password) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: "password too short" }, { status: 400 });
  const existing = await getUserByEmail(email);
  if (existing) return NextResponse.json({ error: "email exists" }, { status: 409 });
  const hash = await bcrypt.hash(password, 10);
  const requiresVerification = role.toLowerCase() === "customer";
  const user = await createUserLocal(email, hash, role, { isActive: !requiresVerification, emailVerified: !requiresVerification });
  if (requiresVerification) {
    const token = createAccessToken({ uid: user.uid, email, purpose: "email_verify" }, 24 * 60 * 60);
    const origin = (() => {
      try {
        return new URL(req.url).origin;
      } catch {
        return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      }
    })();
    const verifyLink = `${origin}/verify-email?token=${encodeURIComponent(token)}`;
    await sendEmail(email, "Verify your AU Canteen account", `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 24px; border: 1px solid #eee; border-radius: 12px;">
        <p style="margin: 0 0 12px;">Hi there 👋</p>
        <h2 style="margin: 0 0 12px;">Confirm your email address</h2>
        <p style="margin: 0 0 12px;">Your account has been created. Please verify your email to activate your account.</p>
        <p style="margin: 0 0 16px;">
          <a href="${verifyLink}" style="display:inline-block;padding:10px 16px;background:#111827;color:#fff;text-decoration:none;border-radius:8px;">Verify Account</a>
        </p>
        <p style="margin: 0 0 12px;">If the button does not work, use this link:</p>
        <p style="margin: 0 0 16px; word-break: break-all;">
          <a href="${verifyLink}">${verifyLink}</a>
        </p>
        <p style="margin: 0 0 16px;">This link expires in 24 hours.</p>
        <p style="color: #666; font-size: 12px;">Best regards,<br/>AU Canteen Team</p>
      </div>
    `);
  }
  return NextResponse.json({ uid: user.uid, email: user.email, requiresVerification }, { status: 201 });
}

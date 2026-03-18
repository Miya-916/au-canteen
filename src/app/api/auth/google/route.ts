import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { getUserByEmail, createUserLocal } from "@/lib/db";
import { createAccessToken } from "@/lib/token";
import { sendEmail } from "@/lib/email";
import { cookies } from "next/headers";
import crypto from "crypto";

export const runtime = "nodejs";

const client = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

export async function POST(req: Request) {
  try {
    const { credential } = await req.json();
    if (!credential) {
      return NextResponse.json({ error: "Missing credential" }, { status: 400 });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const email = payload.email.trim().toLowerCase();
    let user = await getUserByEmail(email);

    if (!user) {
      const randomHash = crypto.randomBytes(16).toString("hex");
      user = await createUserLocal(email, randomHash, "customer", { isActive: false, emailVerified: false });
    }

    if (user.is_active !== true || user.email_verified !== true) {
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
      return NextResponse.json({ error: "Please verify your email before signing in.", requiresVerification: true }, { status: 403 });
    }

    // Issue JWT
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

  } catch (error) {
    console.error("Google Auth Error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}

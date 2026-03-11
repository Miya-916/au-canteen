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
      // Create new user as customer
      // We generate a random password hash since they use Google
      const randomHash = crypto.randomBytes(16).toString("hex");
      user = await createUserLocal(email, randomHash, "customer");

      // Send welcome email
      await sendEmail(email, "Welcome to AU Canteen! 🎉", `
        <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 24px; border: 1px solid #eee; border-radius: 12px;">
          <p style="margin: 0 0 12px;">Hi there 👋</p>
          <h2 style="margin: 0 0 12px;">Welcome to AU Canteen!</h2>
          <p style="margin: 0 0 12px;">Your account has been successfully created. You can now explore the platform and enjoy a more convenient campus dining experience.</p>
          <p style="margin: 0 0 8px;">With AU Canteen, you can:</p>
          <ul style="margin: 0 0 12px; padding-left: 20px;">
            <li>Browse menus from campus food vendors</li>
            <li>Order meals online</li>
            <li>Reserve pickup time slots</li>
            <li>Stay updated with canteen announcements</li>
          </ul>
          <p style="margin: 0 0 12px;">Get started by visiting the platform and ordering your favorite meals.</p>
          <p style="margin: 0 0 16px;">Thank you for joining AU Canteen!</p>
          <p style="color: #666; font-size: 12px;">Best regards,<br/>AU Canteen Team</p>
        </div>
      `);
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

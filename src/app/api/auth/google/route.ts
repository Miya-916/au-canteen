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
      sendEmail(email, "Welcome to AU Canteen! 🎉", `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2>Welcome to AU Canteen!</h2>
          <p>You have successfully signed in with your Google account.</p>
          <p>You can now start ordering food from your favorite shops.</p>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">AU Canteen System</p>
        </div>
      `).catch(console.error);
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

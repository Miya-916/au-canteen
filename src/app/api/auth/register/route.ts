import { NextResponse } from "next/server";
import { createUserLocal, getUserByEmail } from "@/lib/db";
// @ts-expect-error bcrypt types
import bcrypt from "bcryptjs";
import { sendEmail } from "@/lib/email";
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
  const user = await createUserLocal(email, hash, role);
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
  return NextResponse.json(user, { status: 201 });
}

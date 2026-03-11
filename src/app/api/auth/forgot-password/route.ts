 import { NextResponse } from "next/server";
 import { getUserByEmail } from "@/lib/db";
 import { createAccessToken } from "@/lib/token";
 import { sendEmail } from "@/lib/email";
 
 export const runtime = "nodejs";
 
 export async function POST(req: Request) {
   try {
     const body = await req.json();
     const emailRaw: string | undefined = body?.email;
     const email = emailRaw ? emailRaw.trim().toLowerCase() : undefined;
     if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
 
     const user = await getUserByEmail(email);
     // Always respond success to avoid account enumeration
     if (!user || !user.password_hash) {
       return NextResponse.json({ ok: true });
     }
 
     const token = createAccessToken({ uid: user.uid, purpose: "pwd_reset" }, 15 * 60);
     const origin = (() => {
       try {
         return new URL(req.url).origin;
       } catch {
         return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
       }
     })();
     const link = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
 
     await sendEmail(
       email,
       "Reset your AU Canteen password",
       `
       <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 24px; border: 1px solid #eee; border-radius: 12px;">
         <h2 style="margin: 0 0 12px;">Reset your password</h2>
         <p style="margin: 0 0 12px;">We received a request to reset your AU Canteen password. Click the button below to set a new password.</p>
         <p style="margin: 0 0 12px;">This link will expire in 15 mins.</p>
         <div style="margin: 16px 0;">
           <a href="${link}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;">Reset Password</a>
         </div>
         <p style="margin: 12px 0;">If the button doesn't work, copy and paste this URL into your browser:</p>
         <p style="word-break: break-all; color:#444;">${link}</p>
         <p style="color: #666; font-size: 12px; margin-top: 20px;">If you didn't request this, you can ignore this email.</p>
       </div>
       `
     );
 
     return NextResponse.json({ ok: true });
   } catch (error: unknown) {
     const message = error instanceof Error ? error.message : "Internal server error";
     console.error("Forgot password error:", message);
     return NextResponse.json({ error: "Internal server error" }, { status: 500 });
   }
 }

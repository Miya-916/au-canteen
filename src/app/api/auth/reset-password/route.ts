 import { NextResponse } from "next/server";
 import { verifyAccessToken } from "@/lib/token";
 import { getUser, updateUserPassword } from "@/lib/db";
 // @ts-expect-error bcrypt types
 import bcrypt from "bcryptjs";
 
 export const runtime = "nodejs";
 
 export async function POST(req: Request) {
   try {
     const body = await req.json();
     const token: string | undefined = body?.token;
     const password: string | undefined = body?.password;
     if (!token || !password) {
       return NextResponse.json({ error: "missing fields" }, { status: 400 });
     }
     if (password.length < 6) {
       return NextResponse.json({ error: "password too short" }, { status: 400 });
     }
 
     const payload = verifyAccessToken(token);
     if (!payload || typeof payload !== "object") {
       return NextResponse.json({ error: "invalid or expired token" }, { status: 400 });
     }
     const purpose = (payload as { purpose?: string }).purpose;
     const uid = (payload as { uid?: string }).uid;
     if (purpose !== "pwd_reset" || !uid) {
       return NextResponse.json({ error: "invalid token" }, { status: 400 });
     }
 
     const user = await getUser(uid);
     if (!user) {
       return NextResponse.json({ error: "user not found" }, { status: 404 });
     }
     if (!user.password_hash) {
       return NextResponse.json({ error: "password login only" }, { status: 400 });
     }
 
     const hash = await bcrypt.hash(password, 10);
     await updateUserPassword(uid, hash);
 
     return NextResponse.json({ ok: true });
   } catch (error: unknown) {
     const message = error instanceof Error ? error.message : "Internal server error";
     console.error("Reset password error:", message);
     return NextResponse.json({ error: "Internal server error" }, { status: 500 });
   }
 }

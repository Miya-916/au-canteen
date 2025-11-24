import { NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/token";
import { cookies } from "next/headers";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = (req.headers.get("authorization") || "").trim();
  if (auth.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    const payload = verifyAccessToken(token);
    if (!payload) return NextResponse.json({ error: "invalid token" }, { status: 401 });
    return NextResponse.json({ uid: payload.uid, role: payload.role });
  }
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const payload = verifyAccessToken(token);
  if (!payload) return NextResponse.json({ error: "invalid token" }, { status: 401 });
  return NextResponse.json({ uid: payload.uid, role: payload.role });
}
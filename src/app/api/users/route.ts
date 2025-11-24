import { NextResponse } from "next/server";
import { getUser, upsertUser } from "@/lib/db";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const uid = searchParams.get("uid");
  const emailParam = searchParams.get("email");
  const email = emailParam ? emailParam.trim().toLowerCase() : null;
  if (!uid && !email) return NextResponse.json({ error: "uid or email required" }, { status: 400 });
  try {
    const user = uid
      ? await getUser(uid)
      : await (await import("@/lib/db")).getUserByEmail(email!);
    if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const uid: string | undefined = body?.uid;
  const email: string | undefined = body?.email ? String(body.email).trim().toLowerCase() : undefined;
  const role: string | undefined = body?.role;
  if (!uid || !email || !role) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  try {
    console.log("/api/users POST", { uid, email, role });
    await upsertUser(uid, email, role);
    const user = await getUser(uid);
    if (!user) return NextResponse.json({ error: "insert failed" }, { status: 500 });
    console.log("/api/users POST ok", user);
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
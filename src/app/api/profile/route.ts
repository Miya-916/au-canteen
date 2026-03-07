
import { NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/token";
import { cookies } from "next/headers";
import { getUser, updateUserProfile } from "@/lib/db";

export const runtime = "nodejs";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return null;
  
  const payload = verifyAccessToken(token);
  if (!payload) return null;
  
  return payload;
}

export async function GET() {
  const payload = await getAuthUser();
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await getUser(payload.uid as string);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      uid: user.uid,
      email: user.email,
      role: user.role,
      name: user.name || "",
      image_url: user.image_url || "",
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const payload = await getAuthUser();
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, image_url } = body;

    await updateUserProfile(payload.uid as string, name, image_url);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

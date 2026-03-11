import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/token";
import { getUser, updateUserPassword } from "@/lib/db";
// @ts-expect-error bcrypt types
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { currentPassword, newPassword } = body as { currentPassword?: unknown; newPassword?: unknown };

    if (typeof currentPassword !== "string" || typeof newPassword !== "string" || !currentPassword || !newPassword) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // Verify Auth
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value || cookieStore.get("token")?.value;
    
    if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const payload = verifyAccessToken(token);
    if (!payload || typeof payload !== "object" || !("uid" in payload)) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    
    const uid = typeof (payload as { uid?: unknown }).uid === "string" ? (payload as { uid: string }).uid : null;
    if (!uid) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const user = await getUser(uid);
    
    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify Current Password
    if (!user.password_hash) {
        // If user has no password (e.g. oauth only), this flow might need adjustment, 
        // but for this requirement we assume password login.
        return NextResponse.json({ error: "User has no password set" }, { status: 400 });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    // Update Password
    const newHash = await bcrypt.hash(newPassword, 10);
    const out = await updateUserPassword(uid, newHash, typeof user.email === "string" ? user.email : null);
    if (!out.updated) {
      return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
    }
    const refreshedUser = await getUser(uid);
    const refreshedHash = typeof refreshedUser?.password_hash === "string" ? refreshedUser.password_hash : "";
    const changed = !!refreshedHash && (await bcrypt.compare(newPassword, refreshedHash));
    if (!changed) {
      return NextResponse.json({ error: "Password verification failed after update" }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Change password error:", message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/token";
import { getOrdersForUser } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value || cookieStore.get("token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = verifyAccessToken(token);
  const uid = payload && typeof payload === "object" && "uid" in payload ? String(payload.uid) : null;
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const orders = await getOrdersForUser(uid);
    return NextResponse.json(orders || [], {
      headers: {
        "Cache-Control": "no-store",
        "Pragma": "no-cache"
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch orders";
    console.error("Error fetching user orders:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { syncShopBindings } from "@/lib/db";

export async function GET() {
  try {
    const count = await syncShopBindings();
    return NextResponse.json({ message: "Historical account-shop bindings have been synced successfully", count });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json({ error: "Failed to sync bindings" }, { status: 500 });
  }
}

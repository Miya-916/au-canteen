import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/token";
import { createOrder, getOrders, getPickupSlotCounts } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ sid: string }> }) {
  try {
    const { sid } = await params;
    const { searchParams } = new URL(req.url);
    if (searchParams.get("pickupSlots") === "1") {
      const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
      const slots = await getPickupSlotCounts(sid, date);
      return NextResponse.json({
        date,
        start: "08:30",
        end: "14:00",
        intervalMinutes: 15,
        limitPerSlot: 8,
        slots,
      });
    }
    const orders = await getOrders(sid);
    return NextResponse.json(orders || []);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ sid: string }> }) {
  const { sid } = await params;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value || cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyAccessToken(token);
    const uid = payload && typeof payload === "object" && "uid" in payload ? String(payload.uid) : null;
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const pickupTime: string | undefined = body?.pickupTime;
    const noteRaw: unknown = body?.note;
    const itemsRaw: unknown = body?.items;

    const note = typeof noteRaw === "string" ? noteRaw : null;
    if (typeof pickupTime !== "string" || !pickupTime) {
      return NextResponse.json({ error: "pickupTime required" }, { status: 400 });
    }
    if (!Array.isArray(itemsRaw) || itemsRaw.length === 0) {
      return NextResponse.json({ error: "items required" }, { status: 400 });
    }

    const items = itemsRaw
      .map((it) => ({
        menuItemId: typeof it?.menuItemId === "string" ? it.menuItemId : "",
        quantity: Number(it?.quantity),
      }))
      .filter((it) => it.menuItemId && Number.isFinite(it.quantity) && it.quantity > 0);

    if (items.length === 0) return NextResponse.json({ error: "invalid items" }, { status: 400 });

    const order = await createOrder(sid, uid, pickupTime, note, items);
    return NextResponse.json(order, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create order";
    if (message === "slot-full") return NextResponse.json({ error: "slot-full" }, { status: 409 });
    if (message === "out-of-stock") return NextResponse.json({ error: "out-of-stock" }, { status: 409 });
    if (message === "invalid-item") return NextResponse.json({ error: "invalid-item" }, { status: 400 });
    if (message === "invalid-quantity") return NextResponse.json({ error: "invalid-quantity" }, { status: 400 });
    console.error("Error creating order:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

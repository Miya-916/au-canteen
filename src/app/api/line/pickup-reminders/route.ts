import { NextResponse } from "next/server";
import { claimPickupReminders } from "@/lib/db";

export const runtime = "nodejs";

async function sendLinePush(token: string, to: string, messages: unknown[]) {
  if (!to) return;
  await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ to, messages }),
  });
}

export async function GET(req: Request) {
  // Reuse POST logic for manual testing
  return POST(req);
}

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "missing-cron-secret" }, { status: 500 });
  }
  const provided = (req.headers.get("x-cron-secret") || "").trim();
  if (provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  if (!token) {
    return NextResponse.json({ error: "missing-line-channel-access-token" }, { status: 500 });
  }

  const due = await claimPickupReminders(50);
  let sent = 0;
  const failures: { id: string; error: string }[] = [];

  for (const r of due) {
    const to = String(r.line_recipient_id || "").trim();
    if (!to) continue;
    let pickup = r.pickup_slot ? String(r.pickup_slot) : "";
    
    // Add 5 min range logic
    if (pickup && pickup.includes(":") && !pickup.includes("–")) {
      const [h, m] = pickup.split(":").map(Number);
      if (Number.isFinite(h) && Number.isFinite(m)) {
        const startMin = h * 60 + m;
        const endMin = startMin + 5;
        const eh = Math.floor(endMin / 60) % 24;
        const em = endMin % 60;
        const endStr = `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
        pickup = `${pickup}–${endStr}`;
      }
    }

    const total = Number(r.total_amount || 0);
    const oid = String(r.id || "");
    const sid = String(r.shop_id || "");

    const flex = {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "⏰ Pickup Reminder", weight: "bold", color: "#111111", size: "sm" },
          { type: "text", text: `#${oid.slice(0, 8)}`, weight: "bold", size: "xl", margin: "md" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "Pickup", size: "sm", color: "#555555" },
              { type: "text", text: pickup || "-", size: "sm", color: "#111111", align: "end", weight: "bold" },
            ],
          },
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "Total", size: "sm", color: "#555555" },
              { type: "text", text: `฿${Number.isFinite(total) ? total.toFixed(0) : "0"}`, size: "sm", color: "#111111", align: "end", weight: "bold" },
            ],
          },
          { type: "text", text: "It’s almost pickup time. Please begin preparing this order.", size: "sm", color: "#111111", wrap: true },
          {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            contents: [
              {
                type: "button",
                style: "primary",
                color: "#1DB446",
                action: {
                  type: "postback",
                  label: "Ready",
                  data: `shopId=${sid}&orderId=${oid}&status=ready`,
                  displayText: "Marking Ready...",
                },
              },
              {
                type: "button",
                style: "secondary",
                action: {
                  type: "postback",
                  label: "Picked Up",
                  data: `shopId=${sid}&orderId=${oid}&status=completed`,
                  displayText: "Marking Picked Up...",
                },
              },
            ],
          },
        ],
      },
    };

    try {
      await sendLinePush(token, to, [
        {
          type: "text",
          text: `⏰ Pickup reminder\nOrder #${oid.slice(0, 8)}\nPickup: ${pickup || "-"}\nStatus: Preparing`,
        },
        { type: "flex", altText: `Pickup reminder #${oid.slice(0, 8)}`, contents: flex },
      ]);
      sent += 1;
    } catch (e) {
      failures.push({ id: oid, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return NextResponse.json({ ok: true, due: due.length, sent, failures });
}

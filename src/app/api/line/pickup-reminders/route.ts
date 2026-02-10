import { NextResponse } from "next/server";
import { claimPickupReminders } from "@/lib/db";

export const runtime = "nodejs";

async function sendLinePush(to: string, messages: unknown[]) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  if (!token || !to) return;
  await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ to, messages }),
  });
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

  const due = await claimPickupReminders(50);
  let sent = 0;
  const failures: { id: string; error: string }[] = [];

  for (const r of due) {
    const to = String(r.line_recipient_id || "").trim();
    if (!to) continue;
    const pickup = r.pickup_slot ? String(r.pickup_slot) : "";
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
          { type: "text", text: "Order is now [Preparing]. Please start cooking.", size: "sm", color: "#111111", wrap: true },
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
                  label: "Mark Ready",
                  data: `shopId=${sid}&orderId=${oid}&status=ready`,
                  displayText: "Marking Ready...",
                },
              },
              {
                type: "button",
                style: "secondary",
                action: {
                  type: "postback",
                  label: "Mark Picked Up",
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
      await sendLinePush(to, [
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


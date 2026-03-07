export async function sendLinePush(to: string, messages: unknown[]) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  if (!to) return { attempted: false, ok: false, error: "missing-recipient" as const };
  if (!token) return { attempted: false, ok: false, error: "missing-token" as const };
  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ to, messages }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("line-push-failed", res.status, body.slice(0, 400));
      return { attempted: true, ok: false, status: res.status, error: body.slice(0, 400) };
    }
    return { attempted: true, ok: true, status: res.status };
  } catch (e) {
    console.error("line-push-failed", e);
    return { attempted: true, ok: false, error: e instanceof Error ? e.message : "unknown-error" };
  }
}

export function formatBangkokTime(value: unknown) {
  if (!value) return "";

  let d: Date;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    d = value;
  } else {
    const raw = String(value).trim();
    if (!raw) return "";

    const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(raw);
    const looksLikeDateTime = /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/.test(raw);
    const normalized =
      !hasZone && looksLikeDateTime
        ? `${raw.replace(" ", "T")}+07:00`
        : raw;

    d = new Date(normalized);

    if (Number.isNaN(d.getTime())) {
      const t = raw.includes("T") ? raw.split("T")[1] : raw;
      const [h, m] = t.slice(0, 5).split(":").map(Number);
      if (Number.isFinite(h) && Number.isFinite(m)) {
        const startMin = h * 60 + m;
        const endMin = startMin + 5;
        const eh = Math.floor(endMin / 60) % 24;
        const em = endMin % 60;
        const startStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        const endStr = `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
        return `${startStr}–${endStr}`;
      }
      return t.slice(0, 5);
    }
  }

  const start = d;
  const end = new Date(start.getTime() + 5 * 60000);

  const startText = start.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  });

  const endText = end.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  });

  return `${startText}–${endText}`;
}
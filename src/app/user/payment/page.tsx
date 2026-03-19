"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type PendingOrder = {
  sid: string;
  pickupTime: string;
  note: string;
  items: { id: string; name: string; price: number; qty: number }[];
  id?: string;
};

type UserOrderLiteItem = { id: string; name: string; quantity: number; price: number };
type UserOrderLite = {
  id: string;
  shop_id: string;
  status: string;
  receipt_url: string | null;
  pickup_time: string | null;
  note: string | null;
  items: UserOrderLiteItem[];
};

const PICKUP_SLOT_INTERVAL_MINUTES = 5;

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function toStringOrNull(v: unknown) {
  return typeof v === "string" ? v : v == null ? null : String(v);
}

function toNumber(v: unknown) {
  return typeof v === "number" ? v : Number(v);
}

function coerceUserOrderLite(v: unknown): UserOrderLite | null {
  if (!isRecord(v)) return null;
  const id = typeof v.id === "string" ? v.id : "";
  const shopId = typeof v.shop_id === "string" ? v.shop_id : "";
  const status = typeof v.status === "string" ? v.status : "";
  if (!id || !shopId) return null;
  const itemsRaw = Array.isArray(v.items) ? v.items : [];
  const items: UserOrderLiteItem[] = itemsRaw
    .map((it) => {
      if (!isRecord(it)) return null;
      const itemId = typeof it.id === "string" ? it.id : "";
      const name = typeof it.name === "string" ? it.name : "";
      const quantity = toNumber(it.quantity);
      const price = toNumber(it.price);
      if (!name || !Number.isFinite(quantity) || quantity <= 0) return null;
      return { id: itemId, name, quantity, price: Number.isFinite(price) ? price : 0 };
    })
    .filter((x): x is UserOrderLiteItem => !!x);
  return {
    id,
    shop_id: shopId,
    status,
    receipt_url: toStringOrNull(v.receipt_url),
    pickup_time: toStringOrNull(v.pickup_time),
    note: toStringOrNull(v.note),
    items,
  };
}

function isArchivedOrderStatus(status: string) {
  const s = String(status || "").trim().toLowerCase();
  return s === "completed" || s === "cancelled" || s === "expired";
}

function pickOrderForPayment(candidates: UserOrderLite[], sid: string, orderId: string) {
  const foundById = orderId ? candidates.find((o) => o.id === orderId) : null;
  if (foundById) return foundById;
  const bySid = candidates.find((o) => o.shop_id === sid && !isArchivedOrderStatus(o.status));
  if (bySid) return bySid;
  const active = candidates.filter((o) => !isArchivedOrderStatus(o.status));
  if (active.length === 1) return active[0];
  return null;
}

function formatPickupTimeLabel(pickupTime: string) {
  const raw = String(pickupTime || "").trim();
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(raw);
  const looksLikeDateTime = /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/.test(raw);
  const normalized = !hasZone && looksLikeDateTime ? `${raw.replace(" ", "T")}+07:00` : raw;
  const d = new Date(normalized);
  if (!Number.isNaN(d.getTime())) {
    const startText = d.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Bangkok",
    });
    const end = new Date(d.getTime() + PICKUP_SLOT_INTERVAL_MINUTES * 60 * 1000);
    const endText = end.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Bangkok",
    });
    return `${startText}–${endText}`;
  }
  const t = raw.includes("T") ? raw.split("T")[1] : raw;
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return t.slice(0, 5);
  const startMin = h * 60 + m;
  const endMin = startMin + PICKUP_SLOT_INTERVAL_MINUTES;
  const endHour = Math.floor(endMin / 60) % 24;
  const endMinute = endMin % 60;
  const startText = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const endText = `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
  return `${startText}–${endText}`;
}

function toPickupTimestamp(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(raw);
  const looksLikeDateTime = /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/.test(raw);
  const normalized = !hasZone && looksLikeDateTime ? `${raw.replace(" ", "T")}+07:00` : raw;
  const timestamp = new Date(normalized).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function isPickupExpired(value?: string | null) {
  const pickupTs = toPickupTimestamp(value);
  if (pickupTs == null) return false;
  return Date.now() >= pickupTs;
}

export default function PaymentPage() {
  const router = useRouter();
  const [sid, setSid] = useState("");

  const [order, setOrder] = useState<PendingOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [ack, setAck] = useState(false);
  const [orderStatus, setOrderStatus] = useState<string>("pending");
  const [uploadedReceiptUrl, setUploadedReceiptUrl] = useState<string | null>(null);
  const [submittedReceiptUrl, setSubmittedReceiptUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [reference, setReference] = useState("");
  const [confirming, setConfirming] = useState(false);
  const lastStatusRef = useRef<string>("pending");
  const autoRedirectedRef = useRef(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setSid(params.get("sid") || "");
    } catch {
      setSid("");
    }
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!sid) {
          setOrder(null);
          setError("Missing shop id");
          return;
        }
        const raw = sessionStorage.getItem(`pending_order:${sid}`);
        if (raw) {
          const parsed = JSON.parse(raw) as PendingOrder;
          if (!parsed?.sid || !Array.isArray(parsed?.items) || parsed.items.length === 0) {
            setOrder(null);
            setError("Invalid pending order");
            return;
          }
          if (!active) return;
          setOrder(parsed);
        }

        const res = await fetch("/api/orders", { cache: "no-store", signal: controller.signal });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          if (!active) return;
          if (data?.error === "Unauthorized") {
            setError("Please log in to view payment.");
            setOrder(null);
            return;
          }
          setError("Failed to load your order");
          setOrder(null);
          return;
        }
        const list = Array.isArray(data) ? (data as unknown[]) : [];
        const candidates = list.map(coerceUserOrderLite).filter((x): x is UserOrderLite => !!x);
        const currentOrderId = (() => {
          try {
            const raw = sessionStorage.getItem(`pending_order:${sid}`);
            if (!raw) return "";
            const parsed = JSON.parse(raw) as PendingOrder;
            return typeof parsed?.id === "string" ? parsed.id : "";
          } catch {
            return "";
          }
        })();
        const found = pickOrderForPayment(candidates, sid, currentOrderId);

        if (!active) return;

        if (!found) {
          setOrder(null);
          setError("No pending order found");
          return;
        }
        const effectiveSid = found.shop_id || sid;

        const pending: PendingOrder = {
          sid: effectiveSid,
          pickupTime: found.pickup_time || "",
          note: found.note || "",
          items: found.items.map((it) => ({ id: it.id, name: it.name, price: it.price, qty: it.quantity })),
          id: found.id,
        };

        setOrder(pending);
        setError(null);
        setOrderStatus(found.status || "pending");
        if (found.receipt_url) setSubmittedReceiptUrl(found.receipt_url);
        try {
          sessionStorage.setItem(`pending_order:${effectiveSid}`, JSON.stringify(pending));
        } catch {}
      } catch {
        if (!active) return;
        setOrder(null);
        setError("Failed to load pending order");
      } finally {
        if (active) setLoading(false);
      }
    };
    run();
    return () => {
      active = false;
      controller.abort();
    };
  }, [sid]);

  useEffect(() => {
    if (!sid) return;
    let active = true;
    const controller = new AbortController();
    const tick = async () => {
      try {
        const res = await fetch(`/api/orders?t=${Date.now()}`, { cache: "no-store", signal: controller.signal });
        if (res.status === 401) {
          if (active) setError("Session expired. Please log in again.");
          return;
        }
        const data = res.ok ? await res.json() : [];
        const candidates = Array.isArray(data)
          ? (data as unknown[]).map(coerceUserOrderLite).filter((x): x is UserOrderLite => !!x)
          : [];
        const found = pickOrderForPayment(candidates, sid, order?.id || "");
        

        if (active && found) {
          setError(null);
          if (!order?.id) {
            setOrder((prev) => (prev ? { ...prev, id: found.id } : prev));
            try {
              const raw = sessionStorage.getItem(`pending_order:${sid}`);
              if (raw) {
                const parsed = JSON.parse(raw) as PendingOrder;
                sessionStorage.setItem(`pending_order:${sid}`, JSON.stringify({ ...parsed, id: found.id }));
              }
            } catch {}
          }
          const next = String(found.status || "");
          
          setOrderStatus(prev => {
            if (prev !== next) {
              return next;
            }
            return prev;
          });
          
          if ((next || "").toLowerCase() === "cancelled" && (lastStatusRef.current || "").toLowerCase() !== "cancelled") {
            setError("This order was rejected by the shop.");
          }
          lastStatusRef.current = next;
        }
        if (active && found?.receipt_url) setSubmittedReceiptUrl(String(found.receipt_url));
      } catch (e) {
        if (controller.signal.aborted) return;
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (active) setError((prev) => prev || "Connection issue while refreshing order status. Retrying...");
      }
    };
    tick();
    const id = setInterval(tick, 2500);
    return () => {
      active = false;
      controller.abort();
      clearInterval(id);
    };
  }, [order?.id, sid]);

  useEffect(() => {
    if (autoRedirectedRef.current) return;
    if (!order?.id) return;
    if (!submittedReceiptUrl) return;
    autoRedirectedRef.current = true;
    try {
      sessionStorage.removeItem(`pending_order:${order.sid}`);
    } catch {}
    router.replace(`/user/orders?oid=${order.id}`);
  }, [order?.id, order?.sid, router, submittedReceiptUrl]);

  useEffect(() => {
    const accepted = (orderStatus || "").toLowerCase() === "accepted";
    const targetSid = order?.sid || sid;
    if (!targetSid || !accepted) {
      setQrUrl(null);
      setQrLoading(false);
      return;
    }
    const controller = new AbortController();
    setQrLoading(true);
    fetch(`/api/shops/${targetSid}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json().catch(() => null);
      })
      .then((data) => {
        const raw = data?.qrUrl ?? data?.qr_url ?? null;
        setQrUrl(typeof raw === "string" && raw.trim() ? raw : null);
      })
      .catch(() => {})
      .finally(() => setQrLoading(false));
    return () => controller.abort();
  }, [order?.sid, orderStatus, sid]);

  const total = useMemo(() => {
    if (!order) return 0;
    return order.items.reduce((sum, it) => sum + Number(it.price) * Number(it.qty), 0);
  }, [order]);
  const isLatePayment = useMemo(() => isPickupExpired(order?.pickupTime), [order?.pickupTime]);

  
  const uploadReceipt = async (file: File) => {
    if (!order) return;
    if (isLatePayment) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("sid", order.sid || "temp");
      fd.append("kind", "receipt");
      fd.append("orderId", order.id || "");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data?.url) {
        setUploadedReceiptUrl(data.url);
      }
    } finally {
      setUploading(false);
    }
  };

  const sendReceipt = async () => {
    if (!order?.id) return;
    if (isLatePayment) {
      setError("Payment is no longer allowed after pickup time.");
      return;
    }
    setConfirming(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: uploadedReceiptUrl, reference: reference.trim() || null }),
      });
      const ok = res.ok;
      const data = ok ? null : await res.json().catch(() => null);
      if (!ok) {
        if (data?.error === "not-accepted") {
          setError("Waiting for shop to accept the order.");
          return;
        }
        if (data?.error === "payment-expired") {
          setError("Payment is no longer allowed after pickup time.");
          return;
        }
        setError("Failed to send receipt");
        return;
      }
      try {
        sessionStorage.removeItem(`pending_order:${order.sid}`);
      } catch {}
      router.replace(`/user/orders?oid=${order.id}`);
    } catch {
      setError("Failed to send receipt");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-6 dark:bg-black sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Payment</div>
          <Link
            href={sid ? `/user/shops/${sid}` : "/user"}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Back
          </Link>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-zinc-600 dark:text-zinc-400">Loading...</div>
        ) : error ? (
          <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</div>
        ) : order ? (
          <>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-black">
              <div className="flex items-start justify-between gap-3">
                <span className="text-zinc-600 dark:text-zinc-400">Order ID</span>
                <span className="max-w-[70%] break-all text-right font-semibold text-zinc-900 dark:text-zinc-100">
                  {order.id ? `#${order.id}` : "-"}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Pickup</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatPickupTimeLabel(order.pickupTime)}
                </span>
              </div>
              <div className="mt-3">
                <div className="text-zinc-600 dark:text-zinc-400">Order Details</div>
                <div className="mt-2 space-y-1">
                  {order.items.map((it) => (
                    <div key={it.id} className="flex items-start justify-between gap-3 text-zinc-900 dark:text-zinc-100">
                      <span className="min-w-0">
                        {it.qty} × {it.name}
                      </span>
                      <span className="shrink-0 font-medium">฿{(Number(it.price) * Number(it.qty)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-zinc-200 pt-2 dark:border-zinc-800">
                <span className="text-zinc-600 dark:text-zinc-400">Total</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">฿{total.toFixed(2)}</span>
              </div>
              <div className="mt-2">
                <div className={`rounded-md px-3 py-2 text-xs font-semibold ${
                  (orderStatus || "").toLowerCase() === "accepted" ? "bg-emerald-100 text-emerald-800" :
                  (orderStatus || "").toLowerCase() === "expired" ? "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200" :
                  (orderStatus || "").toLowerCase() === "cancelled" ? "bg-rose-100 text-rose-700" :
                  "bg-amber-100 text-amber-700"
                }`}>
                  {(orderStatus || "").toLowerCase() === "accepted" && !isLatePayment
                    ? "Shop accepted. You can pay and send receipt."
                    : (orderStatus || "").toLowerCase() === "accepted" && isLatePayment
                      ? "Pickup time passed. Payment is closed for this order."
                    : (orderStatus || "").toLowerCase() === "expired"
                      ? "This order expired because pickup time passed before payment."
                    : (orderStatus || "").toLowerCase() === "cancelled"
                      ? "Shop rejected this order."
                      : "Waiting for shop to accept..."}
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
              If you placed this order by mistake, no need to panic. If payment is not submitted, the order will expire automatically when pickup time is due.
            </div>

            <div className="mt-5 flex justify-center">
              <div className="relative h-72 w-72 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800">
                {((orderStatus || "").toLowerCase() !== "accepted" || isLatePayment) ? (
                  <div className="flex h-full w-full items-center justify-center text-center text-sm text-zinc-500 dark:text-zinc-400 p-4">
                    {(orderStatus || "").toLowerCase() === "accepted" && isLatePayment
                      ? "Pickup time passed. QR payment is no longer available."
                      : "Waiting for shop to accept the order to show payment QR"}
                  </div>
                ) : qrLoading ? (
                  <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
                    Loading QR...
                  </div>
                ) : qrUrl ? (
                  
                  <img src={qrUrl} alt="QR payment" className="h-full w-full object-contain p-4" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-center text-sm text-zinc-500 dark:text-zinc-400 p-4">
                    QR code not available for this shop
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
              Orders are prepared based on your selected time slot. Payments are non-refundable once payment is confirmed.
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <input
                id="ack"
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
              />
              <label htmlFor="ack">I understand that this order is non-refundable after payment.</label>
            </div>
            <div className="mt-4 space-y-3">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Upload Payment Receipt</label>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">Please upload a screenshot or photo of your payment</div>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadReceipt(f);
                    }}
                    className="block w-full text-sm text-zinc-500 dark:text-zinc-400 file:mr-4 file:rounded-md file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-zinc-700 hover:file:bg-zinc-200 dark:file:bg-zinc-800 dark:file:text-zinc-300 dark:hover:file:bg-zinc-700"
                    disabled={(orderStatus || "").toLowerCase() !== "accepted" || isLatePayment}
                  />
                  {uploading ? <span className="text-xs text-zinc-500">Uploading...</span> : null}
                </div>
                {(uploadedReceiptUrl || submittedReceiptUrl) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={uploadedReceiptUrl || submittedReceiptUrl || ""} alt="Receipt" className="mt-2 h-24 w-full rounded-lg object-cover" />
                )}
              </div>
              <button
                onClick={sendReceipt}
                disabled={confirming || !!submittedReceiptUrl || !ack || (orderStatus || "").toLowerCase() !== "accepted" || !uploadedReceiptUrl || isLatePayment}
                className="w-full rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {submittedReceiptUrl ? "Receipt Submitted" : isLatePayment ? "Payment Closed" : confirming ? "Sending..." : "Send Receipt to Shop"}
              </button>
            </div>
          </>
        ) : (
          <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{error || "No pending order found"}</div>
        )}
      </div>
    </div>
  );
}

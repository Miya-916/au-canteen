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

function formatPickupTimeLabel(pickupTime: string) {
  const t = pickupTime.includes("T") ? pickupTime.split("T")[1] : pickupTime;
  return t.slice(0, 5);
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
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [reference, setReference] = useState("");
  const [confirming, setConfirming] = useState(false);
  const lastStatusRef = useRef<string>("pending");

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setSid(params.get("sid") || "");
    } catch {
      setSid("");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    try {
      if (!sid) {
        setOrder(null);
        setError("Missing shop id");
        return;
      }
      const raw = sessionStorage.getItem(`pending_order:${sid}`);
      if (!raw) {
        setOrder(null);
        setError("No pending order found");
        return;
      }
      const parsed = JSON.parse(raw) as PendingOrder;
      if (!parsed?.sid || !Array.isArray(parsed?.items) || parsed.items.length === 0) {
        setOrder(null);
        setError("Invalid pending order");
        return;
      }
      setOrder(parsed);
    } catch {
      setOrder(null);
      setError("Failed to load pending order");
    } finally {
      setLoading(false);
    }
  }, [sid]);

  useEffect(() => {
    if (!order?.id) return;
    let active = true;
    const controller = new AbortController();
    const tick = async () => {
      try {
        const res = await fetch("/api/orders", { cache: "no-store", signal: controller.signal });
        const data = res.ok ? await res.json() : [];
        const found = Array.isArray(data)
          ? (data as { id: string; status: string; receipt_url?: string | null }[]).find((o) => o.id === order.id)
          : null;
        if (active && found) {
          const next = String(found.status || "");
          setOrderStatus(next);
          if ((next || "").toLowerCase() === "cancelled" && (lastStatusRef.current || "").toLowerCase() !== "cancelled") {
            setError("This order was rejected by the shop.");
          }
          lastStatusRef.current = next;
        }
        if (active && found?.receipt_url) setReceiptUrl(String(found.receipt_url));
      } catch {}
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => {
      active = false;
      controller.abort();
      clearInterval(id);
    };
  }, [order?.id]);

  useEffect(() => {
    const accepted = (orderStatus || "").toLowerCase() === "accepted";
    if (!sid || !accepted) {
      setQrUrl(null);
      setQrLoading(false);
      return;
    }
    const controller = new AbortController();
    setQrLoading(true);
    fetch(`/api/shops/${sid}`, { signal: controller.signal })
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
  }, [sid, orderStatus]);

  const total = useMemo(() => {
    if (!order) return 0;
    return order.items.reduce((sum, it) => sum + Number(it.price) * Number(it.qty), 0);
  }, [order]);

  // Reservation countdown removed: old payment flow without holds
  
  const uploadReceipt = async (file: File) => {
    if (!order) return;
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
        setReceiptUrl(data.url);
      }
    } finally {
      setUploading(false);
    }
  };

  const sendReceipt = async () => {
    if (!order?.id) return;
    setConfirming(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: receiptUrl, reference: reference.trim() || null }),
      });
      const ok = res.ok;
      const data = ok ? null : await res.json().catch(() => null);
      if (!ok) {
        if (data?.error === "not-accepted") {
          setError("Waiting for shop to accept the order.");
          return;
        }
        setError("Failed to send receipt");
        return;
      }
      try {
        sessionStorage.removeItem(`pending_order:${order.sid}`);
      } catch {}
      router.push(`/user/orders`);
    } catch {
      setError("Failed to send receipt");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-10 dark:bg-black">
      <div className="mx-auto w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Payment</div>
          <Link
            href={sid ? `/user/shops/${sid}` : "/user"}
            className="rounded-md border border-zinc-300 px-2 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
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
              <div className="flex items-center justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Pickup</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatPickupTimeLabel(order.pickupTime)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Total</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">฿{total.toFixed(2)}</span>
              </div>
              <div className="mt-2">
                <div className={`rounded-md px-3 py-2 text-xs font-semibold ${
                  (orderStatus || "").toLowerCase() === "accepted" ? "bg-emerald-100 text-emerald-800" :
                  (orderStatus || "").toLowerCase() === "cancelled" ? "bg-rose-100 text-rose-700" :
                  "bg-amber-100 text-amber-700"
                }`}>
                  {(orderStatus || "").toLowerCase() === "accepted"
                    ? "Shop accepted. You can pay and send receipt."
                    : (orderStatus || "").toLowerCase() === "cancelled"
                      ? "Shop rejected this order."
                      : "Waiting for shop to accept..."}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-center">
              <div className="relative h-72 w-72 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800">
                {((orderStatus || "").toLowerCase() !== "accepted") ? (
                  <div className="flex h-full w-full items-center justify-center text-center text-sm text-zinc-500 dark:text-zinc-400 p-4">
                    Waiting for shop to accept the order to show payment QR
                  </div>
                ) : qrLoading ? (
                  <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
                    Loading QR...
                  </div>
                ) : qrUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
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
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Transfer Receipt</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadReceipt(f);
                    }}
                    className="block w-full text-sm"
                    disabled={(orderStatus || "").toLowerCase() !== "accepted"}
                  />
                  {uploading ? <span className="text-xs text-zinc-500">Uploading...</span> : null}
                </div>
                {receiptUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={receiptUrl} alt="Receipt" className="mt-2 h-24 w-full rounded-lg object-cover" />
                )}
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Transaction Reference</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Reference number or note"
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 dark:border-zinc-700 dark:bg-zinc-800"
                  disabled={(orderStatus || "").toLowerCase() !== "accepted"}
                />
              </div>
              <button
                onClick={sendReceipt}
                disabled={confirming || !ack || (orderStatus || "").toLowerCase() !== "accepted" || !receiptUrl}
                className="w-full rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {confirming ? "Sending..." : "Send Receipt to Shop"}
              </button>
            </div>
          </>
        ) : (
          <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">No pending order found</div>
        )}
      </div>
    </div>
  );
}

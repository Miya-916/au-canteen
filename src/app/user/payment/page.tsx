"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type PendingOrder = {
  sid: string;
  pickupTime: string;
  note: string;
  items: { id: string; name: string; price: number; qty: number }[];
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
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

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
      if (!parsed?.sid || !parsed?.pickupTime || !Array.isArray(parsed?.items) || parsed.items.length === 0) {
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
    if (!sid) {
      setQrUrl(null);
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
  }, [sid]);

  const total = useMemo(() => {
    if (!order) return 0;
    return order.items.reduce((sum, it) => sum + Number(it.price) * Number(it.qty), 0);
  }, [order]);

  const confirmPayment = async () => {
    if (!order) return;
    setPaying(true);
    setError(null);
    try {
      const res = await fetch(`/api/shops/${order.sid}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickupTime: order.pickupTime,
          note: order.note,
          items: order.items.map((it) => ({ menuItemId: it.id, quantity: it.qty })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (data?.error === "slot-full") {
          setError("This time slot is full. Please go back and pick another slot.");
          return;
        }
        if (data?.error === "out-of-stock") {
          setError("Some items are out of stock. Please go back and review your cart.");
          return;
        }
        setError("Payment confirmed, but failed to create order.");
        return;
      }

      sessionStorage.removeItem(`pending_order:${order.sid}`);
      router.push(`/user/orders`);
    } catch {
      setError("Failed to confirm payment");
    } finally {
      setPaying(false);
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
            </div>

            <div className="mt-5 flex justify-center">
              <div className="relative h-72 w-72 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800">
                {qrLoading ? (
                  <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
                    Loading QR...
                  </div>
                ) : qrUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrUrl} alt="QR payment" className="h-full w-full object-contain p-4" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-center text-sm text-zinc-500 dark:text-zinc-400">
                    QR code not available for this shop
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={confirmPayment}
                disabled={paying}
                className="w-full rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {paying ? "Confirming..." : "PAID"}
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

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type OrderItem = { id: string; name: string; quantity: number; price: number };
type UserOrder = {
  id: string;
  shop_id: string;
  shop_name?: string | null;
  total_amount: number;
  status: string;
  created_at: string;
  pickup_time?: string | null;
  note?: string | null;
  items: OrderItem[];
};

const steps = ["accepted", "preparing", "ready"] as const;

function normalizeStatus(status: string) {
  return (status || "").trim().toLowerCase();
}

function statusLabel(status: string) {
  const s = normalizeStatus(status);
  if (s === "pending") return "Waiting";
  if (s === "accepted") return "Accepted";
  if (s === "preparing") return "Preparing";
  if (s === "ready") return "Ready to pick up";
  if (s === "completed") return "Completed";
  if (s === "cancelled") return "Cancelled";
  return s || "Unknown";
}

function progressIndex(status: string) {
  const s = normalizeStatus(status);
  if (s === "pending") return -1;
  if (s === "accepted") return 0;
  if (s === "preparing") return 1;
  if (s === "ready") return 2;
  if (s === "completed") return 3;
  if (s === "cancelled") return -1;
  return -1;
}

function formatPickupTimeLabel(pickupTime: string) {
  const t = pickupTime.includes("T") ? pickupTime.split("T")[1] : pickupTime;
  return t.slice(0, 5);
}

export default function UserOrdersPage() {
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"active" | "history">("active");

  const fetchOrders = async (signal?: AbortSignal) => {
    const res = await fetch("/api/orders", { cache: "no-store", signal });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      if (data?.error === "Unauthorized") throw new Error("Please log in to view your orders.");
      throw new Error(data?.error || "Failed to load orders");
    }
    return Array.isArray(data) ? (data as UserOrder[]) : [];
  };

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    fetchOrders(controller.signal)
      .then((data) => {
        if (!active) return;
        setOrders(data);
      })
      .catch((e: unknown) => {
        if (!active) return;
        const msg = typeof e === "object" && e && (e as { message?: string }).message;
        setError(msg || "Failed to load orders");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const interval = setInterval(() => {
      fetchOrders(controller.signal)
        .then((data) => {
          if (!active) return;
          setOrders(data);
        })
        .catch(() => {});
    }, 5000);
    return () => {
      active = false;
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  const activeOrders = useMemo(() => {
    return orders.filter((o) => {
      const s = normalizeStatus(o.status);
      return s !== "completed" && s !== "cancelled";
    });
  }, [orders]);

  const historyOrders = useMemo(() => {
    return orders.filter((o) => {
      const s = normalizeStatus(o.status);
      return s === "completed" || s === "cancelled";
    });
  }, [orders]);

  const visible = tab === "active" ? activeOrders : historyOrders;

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-10 dark:bg-black">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Food Orders</div>
          <Link
            href="/user"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Back
          </Link>
        </div>

        {loading ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            Loading...
          </div>
        ) : error ? (
          <div className="rounded-xl bg-rose-100 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTab("active")}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  tab === "active"
                    ? "bg-indigo-600 text-white"
                    : "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                Active ({activeOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setTab("history")}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  tab === "history"
                    ? "bg-indigo-600 text-white"
                    : "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                History ({historyOrders.length})
              </button>
            </div>

            {visible.length === 0 ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                {tab === "active" ? "No active orders" : "No order history"}
              </div>
            ) : (
              <div className="space-y-4">
                {visible.map((o) => {
                  const idx = progressIndex(o.status);
                  const pct =
                    normalizeStatus(o.status) === "cancelled"
                      ? 0
                      : idx < 0
                        ? 0
                        : idx >= 3
                          ? 100
                          : ((idx + 1) / steps.length) * 100;
                  const showProgress = tab === "active" && normalizeStatus(o.status) !== "cancelled";
                  return (
                    <div key={o.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {o.shop_name || `Shop ${o.shop_id}`}
                          </div>
                          <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                            #{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleString()}
                          </div>
                          {o.pickup_time ? (
                            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                              Pickup: {formatPickupTimeLabel(o.pickup_time)}
                            </div>
                          ) : null}
                        </div>
                        <div className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
                          {statusLabel(o.status)}
                        </div>
                      </div>

                      {showProgress ? (
                        <div className="mt-4">
                          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                            <div className="h-full bg-indigo-600" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                            <span>Accepted</span>
                            <span>Preparing</span>
                            <span>Ready</span>
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-4 space-y-1 text-sm">
                        {(o.items || []).map((it) => (
                          <div key={it.id} className="flex items-center justify-between gap-3">
                            <div className="min-w-0 truncate">
                              <span className="mr-2 inline-flex rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-black dark:text-zinc-200">
                                {it.quantity}x
                              </span>
                              <span className="text-zinc-800 dark:text-zinc-100">{it.name}</span>
                            </div>
                            <div className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                              ฿{(Number(it.price) * Number(it.quantity)).toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="text-zinc-600 dark:text-zinc-400">Total</span>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">฿{Number(o.total_amount).toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

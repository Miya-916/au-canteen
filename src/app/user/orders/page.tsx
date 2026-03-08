"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

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
  receipt_url?: string | null;
  payment_reference?: string | null;
  items: OrderItem[];
};


function normalizeStatus(status: string) {
  return (status || "").trim().toLowerCase();
}

function statusLabel(status: string) {
  const s = normalizeStatus(status);
  if (s === "pending") return "Waiting";
  if (s === "accepted") return "Accepted";
  if (s === "preparing") return "Preparing";
  if (s === "ready") return "Ready for pickup";
  if (s === "completed") return "Completed";
  if (s === "cancelled") return "Rejected";
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
  const raw = String(pickupTime || "").trim();
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(raw);
  const looksLikeDateTime = /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/.test(raw);
  const normalized = !hasZone && looksLikeDateTime ? `${raw.replace(" ", "T")}+07:00` : raw;
  const d = new Date(normalized);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Bangkok",
    });
  }
  const t = raw.includes("T") ? raw.split("T")[1] : raw;
  return t.slice(0, 5);
}

function formatBangkokDateTime(value: string) {
  const d = new Date(value); // value already has Z
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}


export default function UserOrdersPage() {
  const pathname = usePathname();
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"active" | "history">("active");

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payOrder, setPayOrder] = useState<UserOrder | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [reference, setReference] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const fetchOrders = async (signal?: AbortSignal) => {
    const res = await fetch("/api/orders", { cache: "no-store", signal });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      if (data?.error === "Unauthorized") throw new Error("Please log in to view your orders.");
      throw new Error(data?.error || "Failed to load orders");
    }
    return Array.isArray(data) ? (data as UserOrder[]) : [];
  };

  const reloadOrders = () => {
    fetchOrders().then(setOrders).catch(() => {});
  };

  const handlePay = (order: UserOrder) => {
    if (order.receipt_url) {
      alert("Receipt already submitted for this order.");
      return;
    }
    setPayOrder(order);
    setPayModalOpen(true);
    setQrUrl(null);
    setQrLoading(true);
    fetch(`/api/shops/${order.shop_id}`)
      .then((res) => res.json())
      .then((data) => {
        setQrUrl(data.qr_url || data.qrUrl || null);
      })
      .catch(() => {})
      .finally(() => setQrLoading(false));
  };

  /*
  const handlePayOld = (order: UserOrder) => {
    setPayOrder(order);
    setPayModalOpen(true);
    setQrUrl(null);
    setQrLoading(true);
    fetch(`/api/shops/${order.shop_id}`)
      .then((res) => res.json())
      .then((data) => {
        setQrUrl(data.qr_url || data.qrUrl || null);
      })
      .catch(() => {})
      .finally(() => setQrLoading(false));
  };
  */

  const uploadReceipt = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("sid", payOrder?.shop_id || "temp");
      fd.append("kind", "receipt");
      fd.append("orderId", payOrder?.id || "");
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
    if (!payOrder) return;
    setConfirming(true);
    try {
      const res = await fetch(`/api/orders/${payOrder.id}/receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: receiptUrl, reference: reference.trim() || null }),
      });
      if (!res.ok) throw new Error("Failed");
      reloadOrders();
      setPayModalOpen(false);
      setPayOrder(null);
      setReceiptUrl(null);
      setReference("");
    } catch {
      alert("Failed to send receipt");
    } finally {
      setConfirming(false);
    }
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
    }, 1000);
    return () => {
      active = false;
      controller.abort();
      clearInterval(interval);
    };
  }, []);
  
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        reloadOrders();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
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
  const sidebarItems = [
    { href: "/user", label: "Home" },
    { href: "/user/orders", label: "My Orders" },
    { href: "/user/favorites", label: "My Favorites" },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="fixed left-0 top-0 z-40 hidden h-screen w-56 flex-col rounded-r-2xl bg-zinc-200 md:flex">
        <div className="flex-1 overflow-y-auto px-3 pt-6">
          <div className="px-2 text-lg font-semibold text-black">Menu</div>
          <div className="mt-4 space-y-2">
            {sidebarItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive ? "bg-black text-white" : "bg-white text-black hover:bg-zinc-300"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-5xl px-4 py-6 md:pl-64 md:pr-6 md:py-10">
        <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Food Orders</div>
          <Link
            href="/user"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800 md:hidden"
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
                  const showProgress = normalizeStatus(o.status) !== "cancelled";
                  return (
                    <div key={o.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {o.shop_name || `Shop ${o.shop_id}`}
                          </div>
                          <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                            #{o.id.slice(0, 8)} · {(() => {
                              const raw = o.created_at;
                              const normalized = raw.endsWith("Z") ? raw : raw + "Z";
                              return new Date(normalized).toLocaleString("th-TH", {
                                timeZone: "Asia/Bangkok",
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              });
                            })()} 
                          </div>
                            {o.pickup_time ? (
                              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                {(() => {
                                const start = new Date(o.pickup_time);
                                const end = new Date(start.getTime() + 5 * 60000); // 2-minute slot

                                const startStr = start.toLocaleTimeString("th-TH", {
                                  timeZone: "Asia/Bangkok",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }); 

                                const endStr = end.toLocaleTimeString("th-TH", {
                                  timeZone: "Asia/Bangkok",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                });

                                return `Pickup: ${startStr}–${endStr}`;
                              })()}
                            </div>
                          ) : null}

                        </div>
                        <div className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
                          {statusLabel(o.status)}
                        </div>
                      </div>

                      {showProgress ? (
                        <div className="mt-4">
                          <div className="flex items-center justify-between">
                            {["Accepted", "Preparing", "Ready for pickup", "Completed"].map((label, i, arr) => {
                              const state = i < idx ? "done" : i === idx ? "active" : "todo";
                              const baseCircle =
                                state === "done"
                                  ? "bg-emerald-600 text-white"
                                  : state === "active"
                                    ? "bg-indigo-600 text-white"
                                    : "bg-zinc-300 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200";
                              const baseText =
                                state === "done"
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : state === "active"
                                    ? "text-indigo-700 dark:text-indigo-400"
                                    : "text-zinc-500 dark:text-zinc-400";
                              return (
                                <div key={label} className="flex flex-1 items-center">
                                  <div className="flex flex-col items-center">
                                    <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${baseCircle}`}>
                                      {i + 1}
                                    </div>
                                    <div className={`mt-1 text-[11px] font-semibold ${baseText}`}>{label}</div>
                                  </div>
                                  {i < arr.length - 1 && (
                                    <div
                                      className={`mx-2 h-0.5 flex-1 ${
                                        i < idx ? "bg-emerald-600" : i === idx ? "bg-indigo-600" : "bg-zinc-300 dark:bg-zinc-700"
                                      }`}
                                    />
                                  )}
                                </div>
                              );
                            })}
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
                      {normalizeStatus(o.status) === "accepted" && !o.receipt_url && (
                        <div className="mt-4">
                          <button
                            type="button"
                            onClick={() => handlePay(o)}
                            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                          >
                            Pay Now
                          </button>
                        </div>
                      )}
                      {normalizeStatus(o.status) === "accepted" && o.receipt_url ? (
                        <div className="mt-4">
                          <div className="w-full rounded-lg border border-teal-600 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 dark:border-teal-700 dark:bg-teal-900/30 dark:text-teal-200">
                            Receipt Submitted
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      </div>

      {payModalOpen && payOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <div className="mb-4 text-center">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Scan to Pay</h3>
              <p className="text-sm text-zinc-500">Order #{payOrder.id.slice(0, 8)} · ฿{Number(payOrder.total_amount).toFixed(2)}</p>
            </div>
            
            <div className="mb-6 flex justify-center">
              <div className="relative h-64 w-64 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800">
                {qrLoading ? (
                  <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">Loading QR...</div>
                ) : qrUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrUrl} alt="Payment QR" className="h-full w-full object-contain p-2" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-center text-sm text-zinc-500 p-4">
                    QR code not available for this shop
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
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
                />
              </div>
              <button
                onClick={sendReceipt}
                disabled={confirming}
                className="w-full rounded-full bg-teal-600 px-4 py-3 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {confirming ? "Sending..." : "Send Receipt to Shop"}
              </button>
              <button
                onClick={() => setPayModalOpen(false)}
                disabled={confirming}
                className="w-full rounded-full border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

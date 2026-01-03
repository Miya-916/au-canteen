"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type ShopInfo = { name?: string; cuisine?: string | null; address?: string | null; status?: string | null };
type MenuItem = { id: string; name: string; price: number; stock: number; image_url: string | null; category: string | null };

export default function CustomerShopMenu() {
  const params = useParams() as { sid: string };
  const sid = params?.sid;
  const router = useRouter();
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [cart, setCart] = useState<Record<string, number>>({});
  const [showReview, setShowReview] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [shopRes, menuRes] = await Promise.all([
          fetch(`/api/shops/${sid}`, { cache: "no-store" }),
          fetch(`/api/shops/${sid}/menu`, { cache: "no-store" })
        ]);
        const s = shopRes.ok ? await shopRes.json() : null;
        const m = menuRes.ok ? await menuRes.json() : [];
        if (!cancelled) {
          setShop(s);
          setItems(Array.isArray(m) ? m : []);
          const initQty: Record<string, number> = {};
          (Array.isArray(m) ? m : []).forEach((it: MenuItem) => {
            initQty[it.id] = 1;
          });
          setQuantities(initQty);
        }
      } catch {
        if (!cancelled) setError("Failed to load menu");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (sid) load();
    return () => {
      cancelled = true;
    };
  }, [sid]);

  const totalItems = useMemo(() => Object.values(cart).reduce((a, b) => a + b, 0), [cart]);
  const totalPrice = useMemo(() => {
    const map = new Map(items.map((it) => [it.id, it.price]));
    return Object.entries(cart).reduce((sum, [id, qty]) => sum + (map.get(id) || 0) * qty, 0);
  }, [cart, items]);
  const cartItems = useMemo(
    () =>
      items
        .filter((it) => (cart[it.id] || 0) > 0)
        .map((it) => ({ id: it.id, name: it.name, price: it.price, qty: cart[it.id] || 0 })),
    [items, cart]
  );

  const inc = (id: string, stock: number) => {
    setQuantities((q) => {
      const next = Math.min((q[id] || 1) + 1, stock);
      return { ...q, [id]: next };
    });
  };
  const dec = (id: string) => {
    setQuantities((q) => {
      const next = Math.max((q[id] || 1) - 1, 1);
      return { ...q, [id]: next };
    });
  };
  const addToCart = (id: string) => {
    const item = items.find((it) => it.id === id);
    if (!item || item.stock <= 0) return;
    const qty = quantities[id] || 1;
    setCart((c) => {
      const current = c[id] || 0;
      const next = Math.min(current + qty, item.stock);
      return { ...c, [id]: next };
    });
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div
        className="fixed left-0 top-0 z-40 flex h-screen w-56 flex-col gap-2 rounded-r-2xl pt-6"
        style={{ backgroundColor: "#e5e7eb" }}
      >
        <div className="px-4">
          <div className="text-lg font-semibold text-black">AU CANTEEN</div>
        </div>
        <nav className="mt-4 flex flex-col">
          <button
            onClick={() => router.push("/user")}
            className="mx-2 rounded-lg px-4 py-3 text-left text-sm font-medium text-black hover:bg-zinc-300"
          >
            Home
          </button>
          <button
            onClick={() => document.getElementById("cart-summary")?.scrollIntoView({ behavior: "smooth" })}
            className="mx-2 rounded-lg px-4 py-3 text-left text-sm font-medium text-black hover:bg-zinc-300"
          >
            Food Order
          </button>
          <button
            onClick={() => router.back()}
            className="mx-2 mt-auto mb-6 rounded-lg px-4 py-3 text-left text-sm font-medium text-black hover:bg-zinc-300"
          >
            Back
          </button>
        </nav>
      </div>
      <div className="mx-auto max-w-5xl px-6 py-8 pl-64">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{shop?.name || "Shop"}</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {(shop?.cuisine || "Cuisine")} · {(shop?.address || "Location")}
            </p>
          </div>
          <Link
            href="/user"
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          >
            Back
          </Link>
        </div>

        {error && <div className="mb-4 rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</div>}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => {
            const qty = quantities[it.id] || 1;
            const soldOut = it.stock <= 0;
            return (
              <div key={it.id} className="flex h-[300px] w-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="relative h-[150px] w-full overflow-hidden rounded-xl bg-zinc-200 dark:bg-zinc-800">
                  {it.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.image_url} alt={it.name} className="h-full w-full object-cover" />
                  ) : null}
                  {soldOut && (
                    <span className="absolute right-2 top-2 rounded-full bg-rose-600 px-2 py-0.5 text-xs font-semibold text-white">
                      SOLD OUT
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <div className="text-sm font-semibold text-zinc-900 dark:text-white">{it.name}</div>
                  <div className="mt-1 flex items-center justify-between text-sm">
                    <span className="text-zinc-700 dark:text-zinc-300">฿{Number(it.price).toFixed(2)}</span>
                    <span className="text-xs text-zinc-500">Stock: {it.stock}</span>
                  </div>
                  {it.category && (
                    <div className="mt-1 text-xs text-zinc-500">Category: {it.category}</div>
                  )}
                </div>
                <div className="mt-auto flex items-center justify-start gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => dec(it.id)}
                      disabled={qty <= 1 || soldOut}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-300 text-sm hover:bg-zinc-100 disabled:opacity-50"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="min-w-8 text-center text-sm">{qty}</span>
                    <button
                      onClick={() => inc(it.id, it.stock)}
                      disabled={qty >= it.stock || soldOut}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-300 text-sm hover:bg-zinc-100 disabled:opacity-50"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => addToCart(it.id)}
                    disabled={soldOut}
                    className="inline-flex min-w-[100px] items-center justify-center rounded-full bg-yellow-400 px-3 py-2 text-sm font-semibold text-black shadow-md hover:bg-yellow-300 disabled:opacity-50"
                  >
                    Add to cart
                  </button>
                </div>
              </div>
            );
          })}
          {!loading && items.length === 0 && (
            <div className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
              No menu items yet.
            </div>
          )}
        </div>

        <div id="cart-summary" className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-6 rounded-full border border-zinc-300 bg-white px-5 py-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            <div className="text-sm">
              <span className="font-semibold">{totalItems}</span> items ·
              <span className="ml-2 font-semibold">฿{totalPrice.toFixed(2)}</span>
            </div>
            <button onClick={() => setShowReview(true)} className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">
              Review Order
            </button>
          </div>
        </div>
        {showReview && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-lg font-semibold">In Cart</div>
                <button onClick={() => setShowReview(false)} className="rounded-md border border-zinc-300 px-2 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
                  Close
                </button>
              </div>
              <div className="space-y-3">
                {cartItems.map((ci) => (
                  <div key={ci.id} className="flex items-center justify-between">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-zinc-200 text-sm font-medium">{ci.qty}</span>
                    <span className="flex-1 px-3 text-sm font-medium">{ci.name}</span>
                    <span className="text-sm">฿{(ci.price * ci.qty).toFixed(2)}</span>
                  </div>
                ))}
                {cartItems.length === 0 && <div className="text-sm text-zinc-600">No items yet.</div>}
              </div>
              <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <div className="flex items-center justify-between text-base font-semibold">
                  <span>Total</span>
                  <span>฿{totalPrice.toFixed(2)}</span>
                </div>
              </div>
              <div className="mt-4">
                <div className="mb-2 text-sm font-medium">Note</div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-zinc-300 bg-white p-3 text-sm shadow-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
              <div className="mt-6">
                <button className="w-full rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
                  Pick Up Time Slot
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

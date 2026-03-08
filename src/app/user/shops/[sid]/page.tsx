"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type ShopInfo = { name?: string; cuisine?: string | null; address?: string | null; status?: string | null };
type MenuItem = { id: string; name: string; price: number; stock: number; image_url: string | null; category: string | null };
type CartItem = { id: string; menuItemId: string; quantity: number; note?: string };

const PICKUP_SLOT_INTERVAL_MINUTES = 15;
const PICKUP_SLOT_LIMIT = 8;

function getBangkokNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = Number(get("hour") || 0);
  const minute = Number(get("minute") || 0);
  return { date: `${year}-${month}-${day}`, minutes: hour * 60 + minute };
}

function buildPickupSlots(date: string) {
  const slots: { time: string; pickupTime: string }[] = [];
  const startMinutes = 0; // 00:00
  const endMinutes = 24 * 60 + 30; // 24:30 (next day 00:30)
  for (let m = startMinutes; m < endMinutes; m += PICKUP_SLOT_INTERVAL_MINUTES) {
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    const time = `${hh}:${mm}`;
    slots.push({ time, pickupTime: `${date}T${time}:00+07:00` });
  }
  return slots;
}

function formatRangeFromTime(time: string, minutesToAdd: number) {
  const [h, m] = time.split(":").map(Number);
  const endMinRaw = h * 60 + m + minutesToAdd;
  const endMin = endMinRaw % (24 * 60);
  const eh = String(Math.floor(endMin / 60)).padStart(2, "0");
  const em = String(endMin % 60).padStart(2, "0");
  return `${time}–${eh}:${em}`;
}

function formatPickupTimeLabel(pickupTime: string) {
  const t = pickupTime.includes("T") ? pickupTime.split("T")[1] : pickupTime;
  const start = t.slice(0, 5);
  return formatRangeFromTime(start, PICKUP_SLOT_INTERVAL_MINUTES);
}

export default function CustomerShopMenu() {
  const params = useParams() as { sid: string };
  const sid = params?.sid;
  const router = useRouter();
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [note, setNote] = useState("");

  const [pendingSetItem, setPendingSetItem] = useState<MenuItem | null>(null);
  const [setItemNote, setSetItemNote] = useState("");
  const [showSetItemModal, setShowSetItemModal] = useState(false);
 
  const [pickupTime, setPickupTime] = useState<string | null>(null);
  const [slotCounts, setSlotCounts] = useState<Record<string, number>>({});
  const [slotLoading, setSlotLoading] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderMessage, setOrderMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    // Basic client-side role check from cookie
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(";").shift();
    };
    
    // This is a naive check; for security we rely on backend, but this helps UI
    // We don't have easy access to decoded token here without a library, 
    // but we can check if we hit an error later or just let backend handle it.
    // Actually, let's fetch /api/auth/me to get the role if we want to be sure.
    fetch("/api/auth/me").then(res => res.json()).then(data => {
      if (data?.role) setCurrentUserRole(data.role);
    }).catch(() => {});
  }, []);

  const [bangkokNow, setBangkokNow] = useState(() => getBangkokNow());
  useEffect(() => {
    const id = setInterval(() => setBangkokNow(getBangkokNow()), 30000);
    return () => clearInterval(id);
  }, []);

  const pickupDate = useMemo(() => bangkokNow.date, [bangkokNow.date]);
  const pickupSlots = useMemo(() => buildPickupSlots(pickupDate), [pickupDate]);
 
  const loadSlotCounts = async () => {
    if (!sid) return;
    setSlotLoading(true);
    setSlotError(null);
    try {
      const res = await fetch(`/api/shops/${sid}/orders?pickupSlots=1&date=${pickupDate}`, { cache: "no-store" });
      const data = res.ok ? await res.json() : null;
      const slots = data?.slots && typeof data.slots === "object" ? (data.slots as Record<string, number>) : {};
      setSlotCounts(slots);
      if (!res.ok) setSlotError("Failed to load slots");
    } catch {
      setSlotError("Failed to load slots");
    } finally {
      setSlotLoading(false);
    }
  };

  const isBeforeOpening = false; // Allow 24h
  const isShopClosed = shop?.status?.toLowerCase() !== "open";
  const isOwner = currentUserRole === "owner";

  useEffect(() => {
    if (!sid || !showReview) return;
    let alive = true;
    const fetchCounts = async () => {
      try {
        const res = await fetch(`/api/shops/${sid}/orders?pickupSlots=1&date=${pickupDate}`, { cache: "no-store" });
        const data = res.ok ? await res.json() : null;
        const slots = data?.slots && typeof data.slots === "object" ? (data.slots as Record<string, number>) : {};
        if (alive) setSlotCounts(slots);
      } catch {}
    };
    fetchCounts();
    const id = setInterval(fetchCounts, 10000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [sid, showReview, pickupDate]);
  const proceedToPayment = async () => {
    if (!sid) return;
    if (!pickupTime) {
      setOrderMessage({ type: "error", text: "Please select a pickup time slot" });
      return;
    }
    if (cartItems.length === 0) {
      setOrderMessage({ type: "error", text: "Your cart is empty" });
      return;
    }
    
    // Validate Set items have notes
    const invalidSetItem = cartItems.find(it => it.category === "Set" && !it.note?.trim());
    if (invalidSetItem) {
      setOrderMessage({ type: "error", text: `Please add dish selections for ${invalidSetItem.name}` });
      return;
    }

    try {
      setPlacingOrder(true);
      setOrderMessage(null);
      const res = await fetch(`/api/shops/${sid}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickupTime,
          note,
          items: cartItems.map((ci) => ({ menuItemId: ci.menuItemId, quantity: ci.qty, note: ci.note })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (res.status === 401) {
           setOrderMessage({ type: "error", text: "Please log in to place an order." });
           // Optional: You could redirect to login here, but that would clear the cart.
           // router.push("/login?redirect=" + encodeURIComponent(window.location.pathname));
           return;
        }
        if (data?.error === "slot-full") {
          setOrderMessage({ type: "error", text: "This time slot is full. Please pick another slot." });
          return;
        }
        if (data?.error === "out-of-stock") {
          setOrderMessage({ type: "error", text: "Some items are out of stock. Please review your cart." });
          return;
        }
        if (data?.error === "shop-closed") {
          setOrderMessage({ type: "error", text: "Sorry, this shop is currently closed." });
          return;
        }
        if (data?.error === "owners-cannot-order") {
          setOrderMessage({ type: "error", text: "Shop owners cannot place orders." });
          return;
        }
        // Fallback to server error message if available
        setOrderMessage({ type: "error", text: data?.error || "Failed to place order" });
        return;
      }
      const pending = {
        sid,
        pickupTime,
        note,
        items: cartItems.map((ci) => ({ id: ci.menuItemId, name: ci.name, price: ci.price, qty: ci.qty, note: ci.note })),
        id: data?.id || "",
      };
      try {
        sessionStorage.setItem(`pending_order:${sid}`, JSON.stringify(pending));
      } catch {}
      router.push(`/user/payment?sid=${sid}`);
    } catch {
      setOrderMessage({ type: "error", text: "Failed to place order" });
    } finally {
      setPlacingOrder(false);
    }
  };

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

  const totalItems = useMemo(() => cart.reduce((a, b) => a + b.quantity, 0), [cart]);
  const totalPrice = useMemo(() => {
    const map = new Map(items.map((it) => [it.id, it.price]));
    return cart.reduce((sum, ci) => sum + (map.get(ci.menuItemId) || 0) * ci.quantity, 0);
  }, [cart, items]);
  const cartItems = useMemo(
    () =>
      cart.map((ci) => {
        const item = items.find((it) => it.id === ci.menuItemId);
        return {
          id: ci.id, // internal cart id
          menuItemId: ci.menuItemId,
          name: item?.name || "Unknown",
          price: item?.price || 0,
          qty: ci.quantity,
          note: ci.note,
          category: item?.category,
        };
      }),
    [items, cart]
  );
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) set.add(it.category || "Uncategorized");
    return ["All", ...Array.from(set).sort()];
  }, [items]);
  const visibleItems = useMemo(() => {
    if (selectedCategory === "All") return items;
    return items.filter((it) => (it.category || "Uncategorized") === selectedCategory);
  }, [items, selectedCategory]);

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

    if (item.category === "Set") {
      setPendingSetItem(item);
      setSetItemNote("");
      setShowSetItemModal(true);
      return;
    }

    const qty = quantities[id] || 1;
    setCart((prev) => {
      const existingIdx = prev.findIndex(c => c.menuItemId === id && !c.note);
      if (existingIdx >= 0) {
        const next = [...prev];
        const currentQty = next[existingIdx].quantity;
        if (currentQty < item.stock) {
          next[existingIdx] = { ...next[existingIdx], quantity: Math.min(currentQty + qty, item.stock) };
        }
        return next;
      }
      return [...prev, { id: crypto.randomUUID(), menuItemId: id, quantity: qty }];
    });
    setQuantities(prev => ({...prev, [id]: 1}));
  };

  const confirmSetItem = () => {
    if (!pendingSetItem) return;
    if (!setItemNote.trim()) {
      // Should ideally show a better error than alert, but alert is fine for now
      alert("Please provide special instructions for this set.");
      return;
    }
    
    setCart((prev) => [
      ...prev, 
      { 
        id: crypto.randomUUID(), 
        menuItemId: pendingSetItem.id, 
        quantity: 1, 
        note: setItemNote.trim() 
      }
    ]);
    setShowSetItemModal(false);
    setPendingSetItem(null);
    setSetItemNote("");
  };

  const incrementCartItem = (cartId: string) => {
    setCart((prev) => {
      const idx = prev.findIndex(c => c.id === cartId);
      if (idx === -1) return prev;
      
      const item = items.find(it => it.id === prev[idx].menuItemId);
      if (!item) return prev;

      if (prev[idx].quantity >= item.stock) return prev;
      
      const next = [...prev];
      next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
      return next;
    });
  };

  const decrementCartItem = (cartId: string) => {
    setCart((prev) => {
      const idx = prev.findIndex(c => c.id === cartId);
      if (idx === -1) return prev;
      
      if (prev[idx].quantity <= 1) {
        return prev.filter(c => c.id !== cartId);
      }
      
      const next = [...prev];
      next[idx] = { ...next[idx], quantity: next[idx].quantity - 1 };
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div
        className="fixed left-0 top-0 z-40 hidden h-screen w-56 flex-col rounded-r-2xl bg-zinc-200 md:flex"
      >
        <div className="flex-1 overflow-y-auto pt-6">
          <div className="px-4">
            <div className="text-lg font-semibold text-black">{shop?.name || "Shop"}</div>
            <div className="mt-1 text-xs text-black/70">{shop?.cuisine || "Cuisine"}</div>
          </div>
          <div className="mt-4 px-3">
            <div className="text-xs font-semibold text-black/70">Categories</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-md px-3 py-2.5 text-sm font-medium ${
                    selectedCategory === cat ? "bg-black text-white" : "bg-white text-black hover:bg-zinc-300"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-black/10 p-3">
          <button
            onClick={() => router.push("/user")}
            className="mb-2 w-full rounded-lg bg-white px-3 py-2.5 text-left text-sm font-medium text-black hover:bg-zinc-300"
          >
            Home
          </button>
          <button
            onClick={() => router.push("/user/orders")}
            className="mb-2 w-full rounded-lg bg-white px-3 py-2.5 text-left text-sm font-medium text-black hover:bg-zinc-300"
          >
            Food Orders
          </button>
          <button
            onClick={() => router.back()}
            className="w-full rounded-lg bg-white px-3 py-2.5 text-left text-sm font-medium text-black hover:bg-zinc-300"
          >
            Back
          </button>
        </div>
      </div>

      {mobileCategoriesOpen ? (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            aria-label="Close categories"
            onClick={() => setMobileCategoriesOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <div className="text-base font-semibold text-zinc-900 dark:text-white">Categories</div>
              <button
                onClick={() => setMobileCategoriesOpen(false)}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Close
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setMobileCategoriesOpen(false);
                  }}
                  className={`rounded-lg px-3 py-3 text-sm font-medium ${
                    selectedCategory === cat ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setMobileCategoriesOpen(false);
                  router.push("/user");
                }}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                Home
              </button>
              <button
                onClick={() => {
                  setMobileCategoriesOpen(false);
                  router.push("/user/orders");
                }}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                Orders
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="sticky top-0 z-40 border-b border-zinc-200 bg-zinc-50/90 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-black/70 md:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Back
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{shop?.name || "Shop"}</div>
            <div className="truncate text-xs text-zinc-600 dark:text-zinc-400">{(shop?.cuisine || "Cuisine")} · {(shop?.address || "Location")}</div>
          </div>
          <button
            onClick={() => setMobileCategoriesOpen(true)}
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            Categories
          </button>
        </div>
      </div>

      <div className={`mx-auto max-w-7xl px-4 pt-6 ${totalItems > 0 ? "pb-28" : "pb-6"} md:px-6 md:py-8 md:pl-64`}>
        <div className="mb-6 hidden items-center justify-between md:flex">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{shop?.name || "Shop"}</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {(shop?.cuisine || "Cuisine")} · {(shop?.address || "Location")}
            </p>
          </div>
        </div>

        {error && <div className="mb-4 rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</div>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {visibleItems.map((it) => {
            const qty = quantities[it.id] || 1;
            const soldOut = it.stock <= 0;
            return (
              <div key={it.id} className="flex w-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="relative h-[160px] w-full overflow-hidden rounded-xl bg-zinc-200 dark:bg-zinc-800 sm:h-[150px]">
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
                <div className="mt-4 flex min-w-0 flex-col gap-2 sm:mt-auto sm:flex-row sm:items-center">
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => dec(it.id)}
                      disabled={qty <= 1 || soldOut}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-300 text-xs hover:bg-zinc-100 disabled:opacity-50"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="min-w-7 text-center text-xs">{qty}</span>
                    <button
                      onClick={() => inc(it.id, it.stock)}
                      disabled={qty >= it.stock || soldOut}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-300 text-xs hover:bg-zinc-100 disabled:opacity-50"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => addToCart(it.id)}
                    disabled={soldOut || isShopClosed || isOwner}
                    className="inline-flex h-8 w-full min-w-0 items-center justify-center whitespace-nowrap rounded-lg bg-yellow-400 px-2.5 text-xs font-semibold text-black shadow-md hover:bg-yellow-300 disabled:opacity-50 sm:w-0 sm:flex-1 sm:pl-2.5 sm:pr-2.5"
                  >
                    {isOwner ? "Owner" : (isShopClosed ? "Closed" : "Add to cart")}
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

        {totalItems > 0 ? (
          <div id="cart-summary" className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 md:inset-auto md:bottom-4 md:left-1/2 md:-translate-x-1/2 md:px-0 md:pb-0">
            <div className="mx-auto w-full max-w-5xl md:hidden">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {totalItems} items · ฿{totalPrice.toFixed(2)}
                  </div>
                  <div className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">Review before placing your order</div>
                </div>
                <button
                  onClick={() => setShowReview(true)}
                  className="shrink-0 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
                >
                  Review
                </button>
              </div>
            </div>

            <div className="hidden md:block">
              <div className="flex items-center gap-3 rounded-full border border-zinc-300 bg-white px-4 py-2.5 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 sm:gap-6 sm:px-5 sm:py-3">
                <div className="text-sm">
                  <span className="font-semibold">{totalItems}</span> items ·
                  <span className="ml-2 font-semibold">฿{totalPrice.toFixed(2)}</span>
                </div>
                <button onClick={() => setShowReview(true)} className="rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">
                  Review Order
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {showReview && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-lg font-semibold">In Cart</div>
                <button onClick={() => setShowReview(false)} className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
                  Close
                </button>
              </div>
              {orderMessage && (
                <div
                  className={`mb-4 rounded-md px-3 py-2 text-sm ${
                    orderMessage.type === "success"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {orderMessage.text}
                </div>
              )}
              <div className="space-y-3">
                {cartItems.map((ci) => (
                  <div key={ci.id} className="flex flex-col gap-1 border-b border-zinc-100 pb-3 last:border-0 dark:border-zinc-800/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => decrementCartItem(ci.id)}
                          className="flex h-6 w-6 items-center justify-center rounded bg-zinc-200 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="w-4 text-center text-sm font-medium">{ci.qty}</span>
                        <button
                          onClick={() => incrementCartItem(ci.id)}
                          className="flex h-6 w-6 items-center justify-center rounded bg-zinc-200 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <span className="flex-1 px-3 text-sm font-medium">{ci.name}</span>
                      <span className="text-sm">฿{(ci.price * ci.qty).toFixed(2)}</span>
                    </div>
                    {ci.note && (
                      <div className="ml-8 text-xs text-zinc-500 dark:text-zinc-400">
                        Note: {ci.note}
                      </div>
                    )}
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
              <div className="mt-5 flex items-center justify-between text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">Pickup</span>
                <span className="font-semibold">{pickupTime ? formatPickupTimeLabel(pickupTime) : "Not selected"}</span>
              </div>
              <div className="mt-4">
                <select
                  value={pickupTime || ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setOrderMessage(null);
                    setPickupTime(v || null);
                  }}
                  disabled={slotLoading || isBeforeOpening}
                  className="w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-sm shadow-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <option value="" disabled>
                    {slotLoading 
                      ? "Loading..." 
                      : isBeforeOpening 
                        ? "Shop opens at 07:00" 
                        : "Select pickup time"}
                  </option>
                  {!isBeforeOpening && pickupSlots.map((s) => {
                    const count = Number(slotCounts[s.time] || 0);
                    const isFull = count >= PICKUP_SLOT_LIMIT;
                    const slotMin = (() => {
                      const [h, m] = s.time.split(":").map(Number);
                      return h * 60 + m;
                    })();
                    const isPast = pickupDate === bangkokNow.date && slotMin < bangkokNow.minutes;
                    const disabled = isFull || isPast;
                    const label = formatRangeFromTime(s.time, PICKUP_SLOT_INTERVAL_MINUTES);
                    const suffix = isFull ? " (Full)" : ` (${count}/${PICKUP_SLOT_LIMIT})`;
                    return (
                      <option key={s.pickupTime} value={s.pickupTime} disabled={disabled}>
                        {label}
                        {suffix}
                      </option>
                    );
                  })}
                </select>
                {slotError && <div className="mt-2 text-xs text-rose-700">Failed to load pickup slots</div>}
              </div>
              <div className="mt-3">
                <button
                  onClick={proceedToPayment}
                  disabled={!pickupTime || cartItems.length === 0 || placingOrder || isShopClosed}
                  className="w-full rounded-full bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                >
                  {isShopClosed ? "Shop Closed" : (placingOrder ? "Placing Order..." : "Place Order")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showSetItemModal && pendingSetItem && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <h3 className="mb-2 text-lg font-bold text-zinc-900 dark:text-white">
              {pendingSetItem.name}
            </h3>
            <p className="mb-4 text-sm text-zinc-500">
              Please select Meats and Veg from Menu and provide in the box (Required).
            </p>
            <textarea
              value={setItemNote}
              onChange={(e) => setSetItemNote(e.target.value)}
              placeholder="e.g. Sausage, Braised Pork Belly, Broccoli..."
              rows={3}
              className="w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm shadow-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => {
                  setShowSetItemModal(false);
                  setPendingSetItem(null);
                  setSetItemNote("");
                }}
                className="flex-1 rounded-lg border border-zinc-300 py-2.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={confirmSetItem}
                className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

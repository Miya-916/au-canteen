"use client";

import Link from "next/link";
import { useEffect, useMemo, useReducer, useState } from "react";

type Shop = {
  sid: string;
  name: string;
  status: string;
  owner_name: string | null;
  owner_email: string | null;
  cuisine: string | null;
  address: string | null;
  category: string | null;
  image_url?: string | null;
  reason?: string | null;
};
type Announcement = {
  id: string;
  title: string;
  content?: string | null;
  is_published?: boolean;
  publish_time?: string | null;
  is_sticky?: boolean;
  category?: string | null;
  visibility?: string | null;
  created_at?: string | null;
};

type PopularItem = {
  menu_item_id: string;
  name: string;
  image_url?: string | null;
  price?: number | null;
  sold_qty: number;
  shop_id: string;
  shop_name: string;
  shop_cuisine: string | null;
  shop_address: string | null;
  shop_category: string | null;
};

function shopMatches(s: Shop, q: string, floorFilter: string, cuisineFilter: string) {
  const needle = q.trim().toLowerCase();
  if (needle && ![s.name, s.cuisine, s.category, s.address].some((v) => (v || "").toLowerCase().includes(needle))) {
    return false;
  }
  if (floorFilter !== "All Floors") {
    const prefix = floorFilter.split(" ")[0];
    if (!s.address || !s.address.startsWith(prefix)) return false;
  }
  if (cuisineFilter !== "All") {
    const hay = `${s.cuisine || ""} ${s.category || ""}`.toLowerCase();
    if (!hay.includes(cuisineFilter.toLowerCase())) return false;
  }
  return true;
}

function itemMatches(i: PopularItem, q: string, floorFilter: string, cuisineFilter: string) {
  const needle = q.trim().toLowerCase();
  if (needle && ![i.name, i.shop_name, i.shop_cuisine, i.shop_category, i.shop_address].some((v) => (v || "").toLowerCase().includes(needle))) {
    return false;
  }
  if (floorFilter !== "All Floors") {
    const prefix = floorFilter.split(" ")[0];
    if (!i.shop_address || !i.shop_address.startsWith(prefix)) return false;
  }
  if (cuisineFilter !== "All") {
    const hay = `${i.shop_cuisine || ""} ${i.shop_category || ""}`.toLowerCase();
    if (!hay.includes(cuisineFilter.toLowerCase())) return false;
  }
  return true;
}

export default function ShopGallery({
  allShops,
  topShops,
  bestSellingShops,
  timeBasedShops,
  timeLabel,
  popularItems,
}: {
  allShops: Shop[];
  topShops: Shop[];
  bestSellingShops: Shop[];
  timeBasedShops: Shop[];
  timeLabel: string;
  popularItems: PopularItem[];
}) {
  const [query, setQuery] = useState("");
  const [floorFilter, setFloorFilter] = useState("All Floors");
  const [cuisineFilter, setCuisineFilter] = useState("All");
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem("au:favorites") : null;
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      return new Set(arr);
    } catch {
      return new Set();
    }
  });
  const [mounted, forceMounted] = useReducer(() => true, false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ query?: string }>;
      const q = ce.detail?.query ?? "";
      setQuery(q);
    };
    window.addEventListener("au:shop-search", handler as EventListener);
    return () => window.removeEventListener("au:shop-search", handler as EventListener);
  }, []);
  useEffect(() => {
    forceMounted();
  }, []);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/announcements?role=user", { cache: "no-store" });
        const rows: Announcement[] = res.ok ? await res.json() : [];
        if (alive) setAnnouncements(rows || []);
      } catch {
        if (alive) setAnnouncements([]);
      }
    };
    load();
    const id = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  const toggleFavorite = (sid: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      try {
        window.localStorage.setItem("au:favorites", JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  };
  const filteredTop = useMemo(() => {
    return topShops.filter((s) => shopMatches(s, query, floorFilter, cuisineFilter));
  }, [topShops, query, floorFilter, cuisineFilter]);
  const filtered = useMemo(() => {
    return allShops.filter((s) => shopMatches(s, query, floorFilter, cuisineFilter));
  }, [allShops, query, floorFilter, cuisineFilter]);
  const filteredTimeBased = useMemo(() => {
    return timeBasedShops.filter((s) => shopMatches(s, query, floorFilter, cuisineFilter));
  }, [timeBasedShops, query, floorFilter, cuisineFilter]);
  const filteredBestSelling = useMemo(() => {
    return bestSellingShops.filter((s) => shopMatches(s, query, floorFilter, cuisineFilter));
  }, [bestSellingShops, query, floorFilter, cuisineFilter]);
  const filteredPopularItems = useMemo(() => {
    return popularItems.filter((i) => itemMatches(i, query, floorFilter, cuisineFilter));
  }, [popularItems, query, floorFilter, cuisineFilter]);
  const cuisineOptions = ["All", "Chinese", "Thai", "Halal", "Drinks", "Dessert"];
  useMemo(() => favorites, [favorites]);
  const topAnnouncements = useMemo(() => announcements.slice(0, 2), [announcements]);

  const GRID_CLASS = "grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 md:grid-cols-3 lg:gap-7";

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70 sm:p-5">
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-zinc-200 bg-white/85 p-3 dark:border-zinc-700 dark:bg-zinc-800/70">
            <div className="flex flex-wrap items-center gap-2">
              {cuisineOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCuisineFilter(c)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    cuisineFilter === c
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-white text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="w-full sm:w-44">
            <select
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-500"
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
            >
              <option>All Floors</option>
              <option>1F</option>
              <option>2F</option>
            </select>
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/50 dark:bg-yellow-950/30">
        <div className="flex items-start gap-2">
          <span className="text-lg">🔔</span>
          <div className="flex-1">
            <div className="text-base font-semibold text-yellow-900 dark:text-yellow-100">Announcements</div>
            <div className="mt-1 space-y-2">
              {topAnnouncements.length === 0 ? (
                <div className="text-sm text-yellow-900 dark:text-yellow-200">No announcements</div>
              ) : (
                topAnnouncements.map((a) => (
                  <div key={a.id}>
                    <div className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">{a.title}</div>
                    {a.content ? (
                      <div className="mt-0.5 text-sm text-yellow-900/90 dark:text-yellow-200">{a.content}</div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
        <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">⭐ Recommended Shops</h2>
        <div className={GRID_CLASS}>
          {filteredTop.map((s) => (
            <Card key={s.sid} shop={s} isFavorite={mounted && favorites.has(s.sid)} onToggle={toggleFavorite} showFavorite={mounted} />
          ))}
        </div>
      </div>

      {filteredBestSelling.length > 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
          <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">🔥 Best Selling</h2>
          <div className={GRID_CLASS}>
            {filteredBestSelling.map((s) => (
              <Card key={s.sid} shop={s} isFavorite={mounted && favorites.has(s.sid)} onToggle={toggleFavorite} showFavorite={mounted} />
            ))}
          </div>
        </div>
      ) : null}

      {timeLabel && filteredTimeBased.length > 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
          <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">{timeLabel} Recommendations</h2>
          <div className={GRID_CLASS}>
            {filteredTimeBased.map((s) => (
              <Card key={s.sid} shop={s} isFavorite={mounted && favorites.has(s.sid)} onToggle={toggleFavorite} showFavorite={mounted} />
            ))}
          </div>
        </div>
      ) : null}

      {filteredPopularItems.length > 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
          <h2 className="mb-4 text-base font-semibold text-blue-700 dark:text-blue-400">🍽 Popular Dishes</h2>
          <div className={GRID_CLASS}>
            {filteredPopularItems.map((i) => (
              <ItemCard key={i.menu_item_id} item={i} />
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
        <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">🏪 All Shops</h2>
        <div className={GRID_CLASS}>
          {filtered.map((s) => (
            <Card key={s.sid} shop={s} isFavorite={mounted && favorites.has(s.sid)} onToggle={toggleFavorite} showFavorite={mounted} />
          ))}
          {filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
              No shops match your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ shop, isFavorite, onToggle, showFavorite }: { shop: Shop; isFavorite: boolean; onToggle: (sid: string) => void; showFavorite: boolean }) {
  const badge =
    shop.status?.toLowerCase() === "open"
      ? "bg-green-100 text-green-800"
      : "bg-rose-100 text-rose-700";
  return (
    <div className="relative rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
      {showFavorite && (
        <button
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          onClick={() => onToggle(shop.sid)}
          className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-xl leading-none backdrop-blur hover:bg-black/40"
        >
          {isFavorite ? "❤️" : "🤍"}
        </button>
      )}
      <div className="relative h-56 w-full overflow-hidden rounded-xl bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-700">
        {shop.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shop.image_url} alt={shop.name} className="h-full w-full object-cover object-top" />
        ) : null}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div>
          <div className="text-base font-semibold text-zinc-900 dark:text-white">{shop.name}</div>
          <div className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
            {shop.cuisine || "Cuisine"} · {shop.address || "Floor / Stall"}{shop.reason ? ` · ${shop.reason}` : ""}
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge}`}>{shop.status}</span>
      </div>
      <div className="mt-4">
        <Link
          href={`/user/shops/${shop.sid}`}
          className="block w-full rounded-lg bg-zinc-100 py-2 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          View Menu
        </Link>
      </div>
    </div>
  );
}

function ItemCard({ item }: { item: PopularItem }) {
  return (
    <div className="relative rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="h-40 w-full overflow-hidden rounded-xl bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-700 sm:h-36">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="mt-3">
        <div className="text-base font-semibold text-zinc-900 dark:text-white">{item.name}</div>
        <div className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
          {item.shop_name} · {Number(item.sold_qty || 0)} sold
        </div>
      </div>
      <div className="mt-4">
        <Link
          href={`/user/shops/${item.shop_id}`}
          className="block w-full rounded-lg bg-zinc-100 py-2 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          View Shop
        </Link>
      </div>
    </div>
  );
}

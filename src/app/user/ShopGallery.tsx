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
  if (cuisineFilter !== "All Cuisines") {
    if (!s.cuisine || !s.cuisine.includes(cuisineFilter)) return false;
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
  if (cuisineFilter !== "All Cuisines") {
    if (!i.shop_cuisine || !i.shop_cuisine.includes(cuisineFilter)) return false;
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
  const [cuisineFilter, setCuisineFilter] = useState("All Cuisines");
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
  const cuisineOptions = [
    "Thai Cuisine",
    "Chinese Cuisine",
    "Western Cuisine",
    "Japanese Cuisine",
    "Korean Cuisine",
    "Indian Cuisine",
    "Vegetarian Cuisine",
  ];
  useMemo(() => favorites, [favorites]);
  const topAnnouncements = useMemo(() => announcements.slice(0, 2), [announcements]);

  return (
    <div className="space-y-8">
      
 
      <div className="mb-4 -ml-2 sm:-ml-4 flex items-center gap-4 justify-start">
        <div className="w-40">
          <select
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
            value={floorFilter}
            onChange={(e) => setFloorFilter(e.target.value)}
          >
            <option>All Floors</option>
            <option>1F</option>
            <option>2F</option>
          </select>
        </div>
        <div className="w-48">
          <select
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
            value={cuisineFilter}
            onChange={(e) => setCuisineFilter(e.target.value)}
          >
            <option>All Cuisines</option>
            {cuisineOptions.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="mb-2 rounded-xl border border-yellow-200 bg-yellow-50 p-3">
        <div className="flex items-start gap-2">
          <span className="text-lg">🔔</span>
          <div className="flex-1">
            <div className="text-sm font-semibold text-yellow-900">Announcements</div>
            <div className="mt-1 space-y-2">
              {topAnnouncements.length === 0 ? (
                <div className="text-xs text-yellow-900">No announcements</div>
              ) : (
                topAnnouncements.map((a) => (
                  <div key={a.id}>
                    <div className="text-xs font-semibold text-yellow-900">{a.title}</div>
                    {a.content ? (
                      <div className="mt-0.5 text-xs text-yellow-900/90">{a.content}</div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mt-4 mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Recommended Shops</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {filteredTop.map((s) => (
              <Card key={s.sid} shop={s} isFavorite={mounted && favorites.has(s.sid)} onToggle={toggleFavorite} showFavorite={mounted} />
            ))}
          </div>
        </div>

        {filteredBestSelling.length > 0 ? (
          <div>
            <h2 className="mt-4 mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Best-selling Shops</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {filteredBestSelling.map((s) => (
                <Card key={s.sid} shop={s} isFavorite={mounted && favorites.has(s.sid)} onToggle={toggleFavorite} showFavorite={mounted} />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {timeLabel && filteredTimeBased.length > 0 ? (
        <div>
          <h2 className="mt-6 mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{timeLabel} Recommendations</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTimeBased.map((s) => (
              <Card key={s.sid} shop={s} isFavorite={mounted && favorites.has(s.sid)} onToggle={toggleFavorite} showFavorite={mounted} />
            ))}
          </div>
        </div>
      ) : null}

      {filteredPopularItems.length > 0 ? (
        <div>
          <h2 className="mt-6 mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Popular Dishes (Last 7 days)</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPopularItems.map((i) => (
              <ItemCard key={i.menu_item_id} item={i} />
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">All Shops</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
    <div className="relative rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {showFavorite && (
        <button
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          onClick={() => onToggle(shop.sid)}
          className={`absolute right-3 top-3 rounded-full bg-black/30 px-2 py-1 text-sm backdrop-blur hover:bg-black/40 ${
            isFavorite ? "text-yellow-400" : "text-white"
          }`}
        >
          ★
        </button>
      )}
      <div className="h-32 w-full overflow-hidden rounded-xl bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-700">
        {shop.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shop.image_url} alt={shop.name} className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-zinc-900 dark:text-white">{shop.name}</div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400">
            {shop.cuisine || "Cuisine"} · {shop.address || "Location"}{shop.reason ? ` · ${shop.reason}` : ""}
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge}`}>{shop.status}</span>
      </div>
      <div className="mt-4">
        <Link
          href={`/user/shops/${shop.sid}`}
          className="block w-full rounded-lg bg-zinc-100 px-4 py-2 text-center text-sm font-medium hover:bg-zinc-200 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
        >
          View Menu
        </Link>
      </div>
    </div>
  );
}

function ItemCard({ item }: { item: PopularItem }) {
  return (
    <div className="relative rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="h-32 w-full overflow-hidden rounded-xl bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-700">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="mt-3">
        <div className="text-sm font-semibold text-zinc-900 dark:text-white">{item.name}</div>
        <div className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
          {item.shop_name} · {Number(item.sold_qty || 0)} sold
        </div>
      </div>
      <div className="mt-4">
        <Link
          href={`/user/shops/${item.shop_id}`}
          className="block w-full rounded-lg bg-zinc-100 px-4 py-2 text-center text-sm font-medium hover:bg-zinc-200 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
        >
          View Shop
        </Link>
      </div>
    </div>
  );
}

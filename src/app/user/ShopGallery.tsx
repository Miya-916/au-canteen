"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

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
};

export default function ShopGallery({ allShops, topShops }: { allShops: Shop[]; topShops: Shop[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allShops;
    return allShops.filter((s) =>
      [s.name, s.cuisine, s.category, s.address].some((v) => (v || "").toLowerCase().includes(q))
    );
  }, [allShops, query]);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search shops..."
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          />
          <span className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </div>
      </div>

      <div>
        <h2 className="mb-3 inline-block rounded-full bg-white px-3 py-1 text-sm font-medium shadow-sm dark:bg-zinc-900">
          Today’s Top 3 Recommendation Shops
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {topShops.map((s) => (
            <Card key={s.sid} shop={s} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">All Shops</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <Card key={s.sid} shop={s} />
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

function Card({ shop }: { shop: Shop }) {
  const badge =
    shop.status?.toLowerCase() === "open"
      ? "bg-green-100 text-green-800"
      : "bg-rose-100 text-rose-700";
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
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
            {shop.cuisine || "Cuisine"} · {shop.address || "Location"}
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

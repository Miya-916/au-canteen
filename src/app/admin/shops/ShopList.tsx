"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Shop = {
  sid: string;
  name: string;
  status: string;
  owner_name: string | null;
  owner_email: string | null;
  cuisine: string | null;
  address: string | null;
  category: string | null;
};

export default function ShopList({ shops }: { shops: Shop[] }) {
  const router = useRouter();
  const [floorFilter, setFloorFilter] = useState("All Floors");
  const [cuisineFilter, setCuisineFilter] = useState("All Cuisines");
  const [deletingSid, setDeletingSid] = useState<string | null>(null);

  const filteredShops = shops.filter((s) => {
    // Filter by Floor
    if (floorFilter !== "All Floors") {
      const prefix = floorFilter.split(" ")[0]; // "1F" or "2F"
      if (!s.address || !s.address.startsWith(prefix)) {
        return false;
      }
    }

    // Filter by Cuisine
    if (cuisineFilter !== "All Cuisines") {
      // Use includes to support cases where cuisine might have extra text (e.g. bilingual)
      if (!s.cuisine || !s.cuisine.includes(cuisineFilter)) {
        return false;
      }
    }

    return true;
  });

  const cuisineOptions = [
    "Thai Cuisine",
    "Chinese Cuisine",
    "Western Cuisine",
    "Japanese Cuisine",
    "Korean Cuisine",
    "Indian Cuisine",
    "Vegetarian Cuisine"
  ];

  const handleDelete = async () => {
    if (!deletingSid) return;
    
    try {
      const res = await fetch(`/api/shops/${deletingSid}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to delete shop:", error);
    } finally {
      setDeletingSid(null);
    }
  };

  return (
    <div>
      {deletingSid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">Confirm Deletion</h3>
            <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">Are you sure you want to delete this shop?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingSid(null)}
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:gap-4">
        <div className="w-full sm:w-48">
          <select
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 dark:border-zinc-700 dark:bg-zinc-800"
            value={floorFilter}
            onChange={(e) => setFloorFilter(e.target.value)}
          >
            <option>All Floors</option>
            <option>1F</option>
            <option>2F</option>
          </select>
        </div>
        <div className="w-full sm:w-48">
          <select
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 dark:border-zinc-700 dark:bg-zinc-800"
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

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-6 gap-2 border-b border-zinc-200 px-4 py-3 text-sm font-semibold dark:border-zinc-800">
            <div>Name</div>
            <div>Status</div>
            <div>Location</div>
            <div>Cuisine</div>
            <div>Stall Vendor</div>
            <div className="text-right">Actions</div>
          </div>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredShops.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-500">No shops found matching filters.</div>
            ) : (
              filteredShops.map((s) => (
                <div key={s.sid} className="grid grid-cols-6 items-center gap-2 px-4 py-3">
                  <div className="text-sm font-medium">{s.name}</div>
                  <div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${s.status.toLowerCase() === "open" ? "bg-green-100 text-green-800" : "bg-rose-100 text-rose-700"}`}>
                      {s.status}
                    </span>
                  </div>
                  <div className="text-sm text-zinc-700 dark:text-zinc-300">{s.address || "-"}</div>
                  <div className="text-sm text-zinc-700 dark:text-zinc-300">{s.cuisine || "-"}</div>
                  <div className="text-sm text-zinc-700 dark:text-zinc-300">
                    {s.owner_name || "-"}
                    {s.owner_email ? <span className="ml-2 text-xs text-zinc-500">{s.owner_email}</span> : null}
                  </div>
                  <div className="flex justify-end items-center gap-2">
                    <Link href={`/admin/shops/${s.sid}`} className="rounded-md bg-teal-600 px-3 py-1 text-xs font-semibold text-white">
                      Edit
                    </Link>
                    <button
                      onClick={() => setDeletingSid(s.sid)}
                      title="Delete Shop"
                      className="flex h-6 w-6 items-center justify-center rounded-full text-rose-500 hover:bg-rose-100 hover:text-rose-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

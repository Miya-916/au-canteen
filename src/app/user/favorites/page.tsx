 "use client";
 
 import { useEffect, useMemo, useState } from "react";
 import Link from "next/link";
 
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
 
 export default function FavoritesPage() {
   const [allShops, setAllShops] = useState<Shop[]>([]);
   const [favorites, setFavorites] = useState<Set<string>>(() => {
     try {
       const raw = typeof window !== "undefined" ? window.localStorage.getItem("au:favorites") : null;
       const arr = raw ? (JSON.parse(raw) as string[]) : [];
       return new Set(arr);
     } catch {
       return new Set();
     }
   });
 
   useEffect(() => {
     const load = async () => {
       try {
        const res = await fetch("/api/shops", { cache: "no-store" });
         const rows: Shop[] = res.ok ? await res.json() : [];
         setAllShops(rows || []);
       } catch {
         setAllShops([]);
       }
     };
     load();
   }, []);
 
   const favoriteList = useMemo(() => {
     if (favorites.size === 0) return [];
     return allShops.filter((s) => favorites.has(s.sid));
   }, [allShops, favorites]);
 
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
 
   return (
     <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
         <div className="mb-4 flex items-center justify-between">
           <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Your Favorite Shops</h1>
           <Link
             href="/user#home"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
           >
             Back to Home
           </Link>
         </div>
 
         {favoriteList.length === 0 ? (
           <div className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
            No favorites yet. Go back and tap the heart on any shop to save it.
           </div>
         ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-3">
             {favoriteList.map((s) => (
               <Card key={s.sid} shop={s} isFavorite={true} onToggle={toggleFavorite} />
             ))}
           </div>
         )}
       </div>
     </div>
   );
 }
 
 function Card({ shop, isFavorite, onToggle }: { shop: Shop; isFavorite: boolean; onToggle: (sid: string) => void }) {
   const badge =
     shop.status?.toLowerCase() === "open"
       ? "bg-green-100 text-green-800"
       : "bg-rose-100 text-rose-700";
   return (
     <div className="relative rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
     <div className="relative h-36 w-full overflow-hidden rounded-xl bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-700 sm:h-32">
        <button
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          onClick={() => onToggle(shop.sid)}
          className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-xl leading-none backdrop-blur hover:bg-black/55"
        >
          {isFavorite ? "❤️" : "🤍"}
        </button>
         {shop.image_url ? (
           // eslint-disable-next-line @next/next/no-img-element
           <img src={shop.image_url} alt={shop.name} className="h-full w-full object-cover" />
         ) : null}
       </div>
       <div className="mt-3 flex items-center justify-between">
         <div>
          <div className="text-base font-semibold text-zinc-900 dark:text-white">{shop.name}</div>
          <div className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
             {shop.cuisine || "Cuisine"} · {shop.address || "Location"}
           </div>
         </div>
         <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge}`}>{shop.status}</span>
       </div>
       <div className="mt-4">
         <Link
           href={`/user/shops/${shop.sid}`}
          className="block w-full rounded-lg bg-zinc-100 px-4 py-3 text-center text-sm font-medium hover:bg-zinc-200 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
         >
           View Menu
         </Link>
       </div>
     </div>
   );
 }

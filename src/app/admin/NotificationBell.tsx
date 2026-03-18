 "use client";
 
 import { useEffect, useState } from "react";
 import Link from "next/link";
 
 type PendingRow = {
   id: string;
   sid: string;
   shop_name: string;
   changes: Record<string, unknown>;
   status: string;
   created_at: string;
 };
 
 export default function NotificationBell() {
   const [rows, setRows] = useState<PendingRow[]>([]);
   const [open, setOpen] = useState(false);
   const [loading, setLoading] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const seenStorageKey = "admin:pending:seen";

  const readSeenIds = () => {
    try {
      const raw = localStorage.getItem(seenStorageKey);
      if (!raw) return new Set<string>();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set<string>();
      const valid = parsed.filter((id): id is string => typeof id === "string" && id.trim().length > 0);
      return new Set(valid);
    } catch {
      return new Set<string>();
    }
  };

  const persistSeenIds = (ids: Set<string>) => {
    try {
      localStorage.setItem(seenStorageKey, JSON.stringify(Array.from(ids)));
    } catch {}
  };

  const markRowsSeen = (ids: string[]) => {
    if (ids.length === 0) return;
    setSeenIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      persistSeenIds(next);
      return next;
    });
    setRows((prev) => prev.filter((row) => !ids.includes(row.id)));
  };
 
   const load = async () => {
     try {
       setLoading(true);
       const res = await fetch("/api/pending", { cache: "no-store" });
       const data: PendingRow[] = res.ok ? await res.json() : [];
      const pendingRows = (data || []).filter((r) => (r.status || "").toLowerCase() === "pending");
      const sourceSeen = seenIds.size > 0 ? seenIds : readSeenIds();
      const pendingIdSet = new Set(pendingRows.map((r) => r.id));
      const pruned = new Set(Array.from(sourceSeen).filter((id) => pendingIdSet.has(id)));
      if (pruned.size !== sourceSeen.size) persistSeenIds(pruned);
      setSeenIds(pruned);
      setRows(pendingRows.filter((r) => !pruned.has(r.id)));
     } catch {
       setRows([]);
     } finally {
       setLoading(false);
     }
   };
 
   useEffect(() => {
     load();
     const id = setInterval(load, 30000);
     return () => clearInterval(id);
   }, []);
 
   const count = rows.length;
   const latest = rows.slice(0, 5);
 
   return (
     <div className="relative">
       <button
         aria-label="Notifications"
         onClick={() => setOpen((v) => !v)}
         className="relative rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
       >
         <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-zinc-700 dark:text-zinc-200">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0h6z"/>
         </svg>
         {count > 0 && (
           <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-semibold flex items-center justify-center">
             {count > 99 ? "99+" : String(count)}
           </span>
         )}
       </button>
 
       {open && (
         <div className="absolute right-0 mt-2 w-80 rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900 z-50">
           <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
             <div className="text-sm font-semibold">Notifications</div>
             <button
               onClick={load}
               className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
             >
               {loading ? "Refreshing..." : "Refresh"}
             </button>
           </div>
           <div className="max-h-80 overflow-y-auto">
             {latest.length === 0 ? (
               <div className="px-4 py-6 text-sm text-zinc-500">No pending requests</div>
             ) : (
               latest.map((r) => {
                 const msg = typeof r.changes?.message === "string" ? r.changes.message : "";
                 return (
                   <div key={r.id} className="px-4 py-3 border-b last:border-b-0 border-zinc-100 dark:border-zinc-800">
                     <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                       {r.shop_name || "Unknown Shop"}
                     </div>
                     {msg ? (
                       <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">{msg}</div>
                     ) : null}
                     <div className="mt-1 text-[11px] text-zinc-500">
                       {new Date(r.created_at).toLocaleString()}
                     </div>
                   </div>
                 );
               })
             )}
           </div>
           <div className="px-4 py-3">
             <Link
               href="/admin/pending"
               className="block w-full text-center rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              onClick={() => {
                markRowsSeen(rows.map((r) => r.id));
                setOpen(false);
              }}
             >
               View all
             </Link>
           </div>
         </div>
       )}
     </div>
   );
 }

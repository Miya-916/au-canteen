 "use client";
 
 import Link from "next/link";
 import { useEffect, useMemo, useState } from "react";
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
 
 function FilterButton({
   active,
   children,
   onClick,
 }: {
   active: boolean;
   children: React.ReactNode;
   onClick: () => void;
 }) {
   return (
     <button
       onClick={onClick}
      className={`rounded-md border px-3 py-2 text-sm font-medium ${
         active
           ? "border-yellow-400 bg-yellow-200 text-yellow-900"
           : "border-yellow-300 bg-yellow-100 text-yellow-900 hover:bg-yellow-200"
       }`}
     >
       {children}
     </button>
   );
 }
 
 export default function AnnouncementsPage() {
   const [rows, setRows] = useState<Announcement[]>([]);
   const [filter, setFilter] = useState<"all" | "urgent" | "general">("all");
 
   useEffect(() => {
     const load = async () => {
       try {
        const res = await fetch("/api/announcements?role=user", { cache: "no-store" });
         const list: Announcement[] = res.ok ? await res.json() : [];
         setRows(list || []);
       } catch {
         setRows([]);
       }
     };
     load();
   }, []);
 
   const sorted = useMemo(() => {
     return rows
       .filter((a) => a.is_published)
       .sort((a, b) => {
         const ta = (a.publish_time || a.created_at || "").toString();
         const tb = (b.publish_time || b.created_at || "").toString();
         return tb.localeCompare(ta);
       });
   }, [rows]);
 
   const list = useMemo(() => {
     if (filter === "all") return sorted;
     const want = filter === "urgent" ? "urgent" : "general";
     return sorted.filter((a) => (a.category || "general").toLowerCase() === want);
   }, [sorted, filter]);
 
  const labelFor = (a: Announcement) => {
    const cat = (a.category || "general").toLowerCase();
    return cat === "urgent" ? "⚠️ Urgent" : "🔔 General";
  };
  const dateFor = (a: Announcement) => {
     const s = (a.publish_time || a.created_at || "").toString();
     return s.slice(0, 10);
   };
 
   return (
     <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
           <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Canteen Announcements</h1>
           <Link
             href="/user/orders"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
           >
             Back to Home
           </Link>
         </div>
 
        <div className="mb-3 flex flex-col gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
             <span className="text-lg">🔔</span>
            <div className="text-base font-medium text-yellow-900">Announcements</div>
         </div>
        <div className="flex flex-wrap items-center gap-2">
            <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>All</FilterButton>
            <FilterButton active={filter === "urgent"} onClick={() => setFilter("urgent")}>Urgent</FilterButton>
            <FilterButton active={filter === "general"} onClick={() => setFilter("general")}>General</FilterButton>
         </div>
       </div>
 
         {list.length === 0 ? (
           <div className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
             No announcements.
           </div>
         ) : (
           <div className="space-y-4">
             {list.map((a) => (
               <div key={a.id} className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                 <div className="flex items-start gap-3">
                   <span className="text-xl">🔔</span>
                   <div className="flex-1">
                     <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-yellow-900">{a.title}</div>
                      <div className="text-sm font-medium text-yellow-900">{labelFor(a)}</div>
                     </div>
                    <div className="mt-1 text-sm text-yellow-900/90">{a.content}</div>
                     <div className="mt-2 text-[11px] text-yellow-900/80">Published: {dateFor(a)}</div>
                   </div>
                 </div>
               </div>
             ))}
           </div>
         )}
       </div>
     </div>
   );
 }

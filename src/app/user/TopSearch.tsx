 "use client";
 
 import { useState } from "react";
 
 export default function TopSearch() {
   const [query, setQuery] = useState("");
 
  const onChange = (next: string) => {
    setQuery(next);
    window.dispatchEvent(new CustomEvent("au:shop-search", { detail: { query: next } }));
    const el = document.getElementById("shops");
    if (el) {
       el.scrollIntoView({ behavior: "smooth", block: "start" });
     } else {
       window.location.hash = "#shops";
     }
   };
 
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search shops..."
           className="w-full rounded-md border border-white/25 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/70 shadow-sm focus:border-white focus:outline-none focus:ring-1 focus:ring-white/60"
         />
         <span className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 rounded-full bg-white/40" />
       </div>
     </div>
   );
 }

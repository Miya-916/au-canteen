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
    <div className="mx-auto w-full max-w-2xl">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search shops, cuisines, categories... "
          className="w-full rounded-xl border border-white/35 bg-black/30 px-4 py-3 text-base text-white placeholder-white/80 shadow-lg focus:border-white focus:outline-none focus:ring-2 focus:ring-white/70 md:py-4 md:text-base"
        />
      </div>
    </div>
   );
 }

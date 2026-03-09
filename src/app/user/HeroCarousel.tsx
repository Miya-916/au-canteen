 "use client";
 
 import { useMemo } from "react";
 
 export default function HeroCarousel({
   images,
   defaultUrl,
   defaultLabel,
 }: {
   images: { url: string; label?: string }[];
   defaultUrl?: string;
   defaultLabel?: string;
 }) {
   const list = useMemo(() => images.filter((x) => !!x.url), [images]);
   const current = defaultUrl || list[0]?.url || "";
   const currentLabel = defaultLabel || "";
 
   return (
     <>
       <div className="absolute inset-0 z-0">
         {current ? (
           // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt={currentLabel || "Selected"} className="h-full w-full object-cover object-[center_10%]" />
         ) : null}
         <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
       </div>
     </>
   );
 }

"use client";

import { useState, useCallback, useEffect } from "react";
import ShopOwnerClient from "./ShopOwnerClient";

interface Shop {
  sid: string;
  name: string;
  status: string;
  owner_uid: string | null;
  owner_name: string | null;
  cuisine: string | null;
  open_date: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  category: string | null;
}

export default function OwnerLayoutClient({ 
  children,
  shop
}: { 
  children: React.ReactNode;
  shop: Shop;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isResizing, setIsResizing] = useState(false);
  // Avoid hydration mismatch by only rendering custom width after mount
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = mouseMoveEvent.clientX;
        if (newWidth >= 150 && newWidth <= 600) {
          setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);
  
  return (
    <div className="flex h-screen bg-[#f5f5f5] dark:bg-black overflow-hidden select-none">
       {/* 
    
       */}
       {children}
    </div>
  );
}

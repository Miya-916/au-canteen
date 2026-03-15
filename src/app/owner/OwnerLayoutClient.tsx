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

  // We need to pass these props to ShopOwnerClient if it's the child
  // But since ShopOwnerClient is a page component, we wrap it
  // Actually, the structure of owner page is a bit different.
  // The user sees the ShopOwnerClient as the main page content.
  // The layout should provide the sidebar structure.
  
  // However, looking at ShopOwnerClient, it currently includes the Sidebar inside itself!
  // To make it consistent with AdminLayout, we should extract the Sidebar from ShopOwnerClient.
  
  // For now, to support resizing without massive refactor of ShopOwnerClient logic:
  // We can just wrap the children. BUT, ShopOwnerClient has the sidebar built-in.
  // So we need to refactor ShopOwnerClient first to separate the Sidebar.
  
  return (
    <div className="flex h-screen bg-[#f5f5f5] dark:bg-black overflow-hidden select-none">
       {/* 
         Since ShopOwnerClient manages its own sidebar and state (activeView), 
         we cannot easily pull the sidebar out to the Layout without changing how state is managed.
         The AdminLayout has navigation based on URL (/admin, /admin/shops), 
         while OwnerLayout seems to be a Single Page Application (SPA) based on 'activeView' state.
         
         To implement resizable sidebar properly, we should ideally move the resizing logic INTO ShopOwnerClient
         OR refactor ShopOwnerClient to use URL-based routing like Admin.
         
         Given the user request is just "drag left or right", let's modify ShopOwnerClient directly
         to support resizing, instead of creating a wrapper Layout that might conflict with the internal layout.
       */}
       {children}
    </div>
  );
}

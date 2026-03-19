"use client";

import Link from "next/link";
import { type ReactNode, useState, useCallback, useEffect } from "react";
import AdminSidebar from "./AdminSidebar";
import NotificationBell from "./NotificationBell";

export default function AdminLayoutClient({ children }: { children: ReactNode }) {
  const SIDEBAR_MIN_WIDTH = 150;
  const SIDEBAR_MAX_WIDTH = 600;
  const SIDEBAR_COLLAPSED_WIDTH = 72;
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [expandedSidebarWidth, setExpandedSidebarWidth] = useState(256);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<{ name: string; image_url: string } | null>(null);

  useEffect(() => {
    setMounted(true);
    const fetchUser = () => {
      
      fetch(`/api/admin/profile?t=${Date.now()}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) setUser(data);
        })
        .catch(() => {});
    };

    fetchUser();
    
    const handleProfileUpdate = () => fetchUser();
    window.addEventListener("user-profile-updated", handleProfileUpdate);
    return () => window.removeEventListener("user-profile-updated", handleProfileUpdate);
  }, []);

  const startResizing = useCallback(() => {
    if (isSidebarCollapsed) return;
    setIsResizing(true);
  }, [isSidebarCollapsed]);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing && !isSidebarCollapsed) {
        const newWidth = mouseMoveEvent.clientX;
        if (newWidth >= SIDEBAR_MIN_WIDTH && newWidth <= SIDEBAR_MAX_WIDTH) {
          setSidebarWidth(newWidth);
          setExpandedSidebarWidth(newWidth);
        }
      }
    },
    [isResizing, isSidebarCollapsed, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH]
  );

  const toggleSidebar = useCallback(() => {
    if (isSidebarCollapsed) {
      const restoredWidth = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, expandedSidebarWidth));
      setSidebarWidth(restoredWidth);
      setIsSidebarCollapsed(false);
      return;
    }
    setExpandedSidebarWidth(sidebarWidth);
    setSidebarWidth(SIDEBAR_COLLAPSED_WIDTH);
    setIsSidebarCollapsed(true);
  }, [isSidebarCollapsed, SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH, expandedSidebarWidth, sidebarWidth, SIDEBAR_COLLAPSED_WIDTH]);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const navItems = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/shops", label: "Shops Management" },
    { href: "/admin/owners", label: "Shop Owners" },
    { href: "/admin/pending", label: "Pending Updates" },
    { href: "/admin/announcements", label: "Announcement" },
    { href: "/admin/settings", label: "Settings" },
  ];

  return (
    <div className="flex h-screen bg-[#f5f5f5] dark:bg-black overflow-hidden select-none">
      <AdminSidebar
        width={mounted ? (isSidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth) : 256}
        isCollapsed={isSidebarCollapsed}
        onToggleSidebar={toggleSidebar}
        user={user}
      />
      {}
      <div
        className={`w-1 hidden md:block transition-colors bg-transparent relative z-50 -ml-0.5 ${isSidebarCollapsed ? "pointer-events-none opacity-0" : "cursor-col-resize hover:bg-indigo-500 active:bg-indigo-600 opacity-100"}`}
        onMouseDown={startResizing}
      />
      <div className="flex flex-1 flex-col h-full min-w-0">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900 z-10 sm:px-6 sm:py-5 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <details className="relative md:hidden">
              <summary className="list-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </summary>
              <div className="absolute left-0 mt-2 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                <div className="p-2">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={item.href === "/admin/settings"
                        ? "block rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
                        : "block rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </details>
            <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">AU CANTEEN</h1>
          </div>
          <div className="flex items-center gap-5">
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

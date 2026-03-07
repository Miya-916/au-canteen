"use client";

import Link from "next/link";
import { type ReactNode, useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "./AdminSidebar";
import NotificationBell from "./NotificationBell";

export default function AdminLayoutClient({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isResizing, setIsResizing] = useState(false);
  // Avoid hydration mismatch by only rendering custom width after mount
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<{ name: string; image_url: string } | null>(null);

  useEffect(() => {
    setMounted(true);
    const fetchUser = () => {
      // Add timestamp to prevent caching
      fetch(`/api/admin/profile?t=${Date.now()}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) setUser(data);
        })
        .catch(() => {});
    };

    fetchUser();
    
    // Listen for profile updates
    const handleProfileUpdate = () => fetchUser();
    window.addEventListener("user-profile-updated", handleProfileUpdate);
    return () => window.removeEventListener("user-profile-updated", handleProfileUpdate);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

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
      <AdminSidebar width={mounted ? sidebarWidth : 256} user={user} />
      {/* Resizer Handle */}
      <div
        className="w-1 cursor-col-resize hidden md:block transition-colors hover:bg-indigo-500 active:bg-indigo-600 bg-transparent relative z-50 -ml-0.5"
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
                      className="block rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
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

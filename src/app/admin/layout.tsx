import Link from "next/link";
import type { ReactNode } from "react";
import AdminSidebar from "./AdminSidebar";
import NotificationBell from "./NotificationBell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const navItems = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/shops", label: "Shops Management" },
    { href: "/admin/owners", label: "Shop Owners" },
    { href: "/admin/pending", label: "Pending Updates" },
    { href: "/admin/announcements", label: "Announcement" },
    { href: "/admin/settings", label: "Settings" },
  ];

  return (
    <div className="flex h-screen bg-[#f5f5f5] dark:bg-black overflow-hidden">
      <AdminSidebar />
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
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm">A</div>
              <span className="hidden text-sm font-medium text-zinc-900 dark:text-white sm:inline">Admin</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

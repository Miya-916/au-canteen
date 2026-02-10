"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  const navItems = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/shops", label: "Shops Management" },
    { href: "/admin/owners", label: "Shop Owners" },
    { href: "/admin/pending", label: "Pending Updates" },
    { href: "/admin/announcements", label: "Announcement" },
    { href: "/admin/settings", label: "Settings" },
  ];

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-zinc-100 text-zinc-600 border-r border-zinc-200 overflow-y-auto">
      <div className="flex items-center gap-3 px-6 py-6 text-xl font-semibold shrink-0 border-b border-zinc-200 text-zinc-900">
        <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm text-white">A</div>
        <span>Admin</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 py-6">
        {navItems.map((item) => (
          <Link
            key={item.href}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
              isActive(item.href)
                ? "bg-white text-indigo-600 shadow-sm ring-1 ring-zinc-200"
                : "text-zinc-500 hover:bg-zinc-200/50 hover:text-zinc-900"
            } ${item.href === "/admin/settings" ? "mt-auto" : ""}`}
            href={item.href}
          >
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}

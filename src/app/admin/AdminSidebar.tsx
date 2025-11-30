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
    <aside className="flex h-full w-64 shrink-0 flex-col bg-teal-700 text-white overflow-y-auto">
      <div className="flex items-center gap-3 px-6 py-6 text-xl font-semibold shrink-0">
        <div className="h-10 w-10 rounded-full bg-teal-600" />
        <span>logo</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 pb-6">
        {navItems.map((item) => (
          <Link
            key={item.href}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
              isActive(item.href)
                ? "bg-teal-800 font-medium text-white shadow-sm"
                : "hover:bg-teal-600/40 text-teal-100/90 hover:text-white"
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

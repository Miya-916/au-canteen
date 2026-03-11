"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

export default function AdminSidebar({ 
  width,
  isCollapsed = false,
  onToggleSidebar,
  user
}: { 
  width?: number;
  
  isCollapsed?: boolean;
  onToggleSidebar?: () => void;
  user?: { name: string; image_url: string } | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login?role=admin");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
      router.push("/login?role=admin&logout=1");
      router.refresh();
    }
  };

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  const navItems = [
    { 
      href: "/admin", 
      label: "Dashboard",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
      )
    },
    { 
      href: "/admin/shops", 
      label: "Shops Management",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
      )
    },
    { 
      href: "/admin/owners", 
      label: "Shop Owners",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
      )
    },
    { 
      href: "/admin/pending", 
      label: "Pending Updates",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
      )
    },
    { 
      href: "/admin/announcements", 
      label: "Announcement",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path></svg>
      )
    },
    { 
      href: "/admin/settings", 
      label: "Settings",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
      )
    },
  ];

  return (
    <aside 
      style={{ width: width ? `${width}px` : undefined }}
      className={`hidden h-full shrink-0 flex-col bg-zinc-100 text-zinc-600 border-r border-zinc-200 overflow-y-auto md:flex ${!width ? 'w-64' : ''}`}
    >
      <div className={`flex items-center gap-2 py-4 text-xl font-semibold shrink-0 border-b border-zinc-200 text-zinc-900 overflow-visible relative ${isCollapsed ? "px-2" : "px-4"}`}>
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className={`flex items-center outline-none ${isCollapsed ? "justify-center" : "gap-2"}`}
          >
            <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm text-white overflow-hidden shrink-0 cursor-pointer hover:opacity-90 transition-opacity">
              {user?.image_url ? (
                <img src={user.image_url} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                (user?.name || "A").charAt(0).toUpperCase()
              )}
            </div>
            {!isCollapsed && <span className="truncate max-w-[120px]">{user?.name || "Admin"}</span>}
          </button>
          {isProfileOpen && (
            <div className={`absolute w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-zinc-900 dark:ring-zinc-700 z-[100] ${isCollapsed ? "left-full top-0 ml-2 origin-top-left" : "left-0 mt-2 origin-top-left"}`}>
              <Link
                href="/admin/profile"
                className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                onClick={() => setIsProfileOpen(false)}
              >
                My Profile
              </Link>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onToggleSidebar}
          className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-200/60 hover:text-zinc-900"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="4" stroke="currentColor" strokeWidth="1.8" />
            <line x1={isCollapsed ? "15" : "9"} y1="6.5" x2={isCollapsed ? "15" : "9"} y2="17.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <rect x={isCollapsed ? "16.5" : "4.5"} y="6.5" width="3" height="11" rx="1.5" fill="currentColor" className="opacity-40" />
          </svg>
        </button>
      </div>
      <nav className={`flex flex-1 flex-col gap-1 py-6 ${isCollapsed ? "px-2" : "px-3"}`}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            className={`flex items-center rounded-lg py-3 text-left transition-colors overflow-hidden ${isCollapsed ? "justify-center px-2" : "gap-3 px-4"} ${
              isActive(item.href)
                ? "bg-white text-indigo-600 shadow-sm ring-1 ring-zinc-200"
                : "text-zinc-500 hover:bg-zinc-200/50 hover:text-zinc-900"
            } ${item.href === "/admin/settings" ? "mt-auto" : ""}`}
            href={item.href}
            title={item.label}
          >
            {item.icon}
            {!isCollapsed && <span className="truncate">{item.label}</span>}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

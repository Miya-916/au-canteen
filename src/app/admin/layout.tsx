import type { ReactNode } from "react";
import Link from "next/link";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-black">
      <aside className="w-64 shrink-0 bg-teal-700 text-white">
        <div className="flex items-center gap-3 px-6 py-6 text-xl font-semibold">
          <div className="h-10 w-10 rounded-full bg-teal-600" />
          <span>logo</span>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          <Link className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-teal-600/40" href="/admin">
            <span>Dashboard</span>
          </Link>
          <Link className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-teal-600/40" href="/admin/shops">
            <span>Shops Management</span>
          </Link>
          <a className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-teal-600/40" href="#">
            <span>Shop Owners</span>
          </a>
          <a className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-teal-600/40" href="#">
            <span>Pending Updates</span>
          </a>
          <a className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-teal-600/40" href="#">
            <span>Announcement</span>
          </a>
          <a className="mt-auto flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-teal-600/40" href="#">
            <span>Settings</span>
          </a>
        </nav>
      </aside>
      <main className="flex-1">
        <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-8 py-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-2xl font-semibold tracking-tight">AU CANTEEN</h1>
          <div className="flex items-center gap-5">
            <div className="h-6 w-6 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              <span className="text-sm font-medium">Admin</span>
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
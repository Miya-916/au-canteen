import type { ReactNode } from "react";
import AdminSidebar from "./AdminSidebar";
import NotificationBell from "./NotificationBell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-[#f5f5f5] dark:bg-black overflow-hidden">
      <AdminSidebar />
      <div className="flex flex-1 flex-col h-full min-w-0">
        <header className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-8 py-5 dark:border-zinc-800 dark:bg-zinc-900 z-10">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">AU CANTEEN</h1>
          <div className="flex items-center gap-5">
            <NotificationBell />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm">A</div>
              <span className="text-sm font-medium text-zinc-900 dark:text-white">Admin</span>
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

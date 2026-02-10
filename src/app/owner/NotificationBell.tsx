"use client";

import { useEffect, useState } from "react";

type PendingRow = {
  id: string;
  sid: string;
  shop_name: string;
  changes: Record<string, unknown>;
  status: string;
  created_at: string;
  owner_read_at?: string | null;
};

export default function NotificationBell({ sid, onView }: { sid: string; onView?: () => void }) {
  const [rows, setRows] = useState<PendingRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/pending", { cache: "no-store" });
      const data: PendingRow[] = res.ok ? await res.json() : [];
      const filtered = (data || []).filter((r) => {
        const s = (r.status || "").toLowerCase();
        const unread = !r.owner_read_at;
        return r.sid === sid && unread && (s === "approved" || s === "rejected");
      });
      // newest first
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRows(filtered);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sid]);

  const count = rows.length;
  const latest = rows.slice(0, 5);

  return (
    <div className="relative">
      <button
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-zinc-700 dark:text-zinc-200">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0h6z"/>
        </svg>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-600 text-white text-[10px] font-semibold flex items-center justify-center">
            {count > 99 ? "99+" : String(count)}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900 z-50">
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="text-sm font-semibold">Admin Decisions</div>
            <button
              onClick={load}
              className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {latest.length === 0 ? (
              <div className="px-4 py-6 text-sm text-zinc-500">No decisions yet</div>
            ) : (
              latest.map((r) => {
                const s = (r.status || "").toLowerCase();
                const msg = typeof r.changes?.message === "string" ? r.changes.message : "";
                const badgeClass =
                  s === "approved"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";
                const label = s === "approved" ? "Approved" : "Rejected";
                return (
                  <div key={r.id} className="px-4 py-3 border-b last:border-b-0 border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Update Request</div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${badgeClass}`}>{label}</span>
                    </div>
                    {msg ? (
                      <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">{msg}</div>
                    ) : null}
                    <div className="mt-1 text-[11px] text-zinc-500">
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                    <div className="mt-2">
                      <button
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
                        onClick={async () => {
                          try {
                            await fetch(`/api/pending/${r.id}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ action: "read" }),
                            });
                          } catch {}
                          setRows((prev) => prev.filter((x) => x.id !== r.id));
                          setOpen(false);
                          if (onView) onView();
                        }}
                      >
                        View
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

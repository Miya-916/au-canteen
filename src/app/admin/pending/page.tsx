 "use client";
 
 import { useEffect, useState } from "react";
 
 type PendingRow = {
   id: string;
   sid: string;
   shop_name: string;
   changes: Record<string, unknown>;
   status: string;
   created_at: string;
 };
 
 export default function PendingUpdatesPage() {
   const [rows, setRows] = useState<PendingRow[]>([]);
   const [loading, setLoading] = useState(false);
 
   const load = async () => {
     try {
       const res = await fetch("/api/pending", { cache: "no-store" });
       const data = res.ok ? await res.json() : [];
       setRows(data || []);
     } catch {
       setRows([]);
     }
   };
 
   useEffect(() => {
     load();
   }, []);
 
 const act = async (id: string, action: "approve" | "reject" | "updated") => {
    setLoading(true);
    try {
      await fetch(`/api/pending/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: action === "approve" ? "approved" : action === "reject" ? "rejected" : "updated" }
            : r
        )
      );
      await load();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Pending Updates</h2>
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-5 gap-2 border-b border-zinc-200 px-4 py-3 text-sm font-semibold dark:border-zinc-800">
            <div>Shop</div>
            <div className="col-span-2">Requested Changes</div>
            <div>Status</div>
            <div className="text-right">Actions</div>
          </div>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {rows.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-500">No pending updates.</div>
            ) : (
              rows.map((u) => (
                <div key={u.id} className="grid grid-cols-5 items-center gap-2 px-4 py-3">
                  <div className="text-sm font-medium">{u.shop_name}</div>
                  <div className="col-span-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {Object.entries(u.changes).map(([key, val]) => (
                      <div key={key}>
                        <span className="font-medium text-zinc-900 dark:text-zinc-100 capitalize">
                          {key.replace(/_/g, " ")}:
                        </span>{" "}
                        {String(val)}
                      </div>
                    ))}
                  </div>
                  <div>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        (u.status || "").toLowerCase() === "approved"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : (u.status || "").toLowerCase() === "rejected"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                          : (u.status || "").toLowerCase() === "updated"
                          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      }`}
                    >
                      {(u.status || "").toLowerCase() === "approved"
                        ? "Accepted"
                        : (u.status || "").toLowerCase() === "rejected"
                        ? "Rejected"
                        : (u.status || "").toLowerCase() === "updated"
                        ? "Updated"
                        : "Pending"}
                    </span>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => act(u.id, "updated")}
                      disabled={loading || !["approved", "rejected"].includes((u.status || "").toLowerCase())}
                      className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                      Updated
                    </button>
                    <button
                      onClick={() => act(u.id, "approve")}
                      disabled={loading || (u.status || "").toLowerCase() !== "pending"}
                      className="rounded-md bg-teal-600 px-3 py-1 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => act(u.id, "reject")}
                      disabled={loading || (u.status || "").toLowerCase() !== "pending"}
                      className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-900/20 dark:text-rose-400 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

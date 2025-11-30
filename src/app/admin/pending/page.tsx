export default async function PendingUpdatesPage() {
  const res = await fetch("http://localhost:3000/api/pending", { cache: "no-store" });
  const rows: {
    id: string;
    sid: string;
    shop_name: string;
    changes: Record<string, any>;
    status: string;
    created_at: string;
  }[] = res.ok ? await res.json() : [];

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Pending Updates</h2>
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid grid-cols-4 gap-2 border-b border-zinc-200 px-4 py-3 text-sm font-semibold dark:border-zinc-800">
          <div>Shop</div>
          <div className="col-span-2">Requested Changes</div>
          <div className="text-right">Actions</div>
        </div>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-500">No pending updates.</div>
          ) : (
            rows.map((u) => (
              <div key={u.id} className="grid grid-cols-4 items-center gap-2 px-4 py-3">
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
                <div className="flex justify-end gap-2">
                  <button className="rounded-md bg-teal-600 px-3 py-1 text-xs font-semibold text-white hover:bg-teal-700">
                    Approve
                  </button>
                  <button className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-900/20 dark:text-rose-400">
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

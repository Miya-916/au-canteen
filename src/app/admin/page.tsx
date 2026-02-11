export default async function AdminHome() {
  const res = await fetch("http://localhost:3000/api/admin/stats", { cache: "no-store" });
  const stats: { totalShops: number; openShops: number; pendingUpdates: number; todaysVisitors: number } = res.ok
    ? await res.json()
    : { totalShops: 0, openShops: 0, pendingUpdates: 0, todaysVisitors: 0 };
  const overview = [
    { label: "Total Shops", icon: "🏪", value: stats.totalShops },
    { label: "Open Shops", icon: "🟢", value: stats.openShops },
    { label: "Pending Updates", icon: "⏳", value: stats.pendingUpdates },
    { label: "Today’s Visitors", icon: "👥", value: stats.todaysVisitors },
  ];
  const shopsRes = await fetch("http://localhost:3000/api/shops", { cache: "no-store" });
  const shops: { sid: string; name: string; status: string | null; owner_name: string | null; email: string | null }[] =
    shopsRes.ok ? await shopsRes.json() : [];
  const pendingRes = await fetch("http://localhost:3000/api/pending", { cache: "no-store" });
  const pendingRows: { id: string; sid: string; shop_name: string; changes: Record<string, unknown>; status: string; created_at: string }[] =
    pendingRes.ok ? await pendingRes.json() : [];
  const pending = pendingRows.filter((r) => (r.status || "").toLowerCase() === "pending").slice(0, 6);
  return (
        <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          <h2 className="text-lg font-semibold">Overview</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {overview.map((card) => (
              <div key={card.label} className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:gap-3 sm:p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-lg dark:bg-zinc-800 sm:h-10 sm:w-10">
                  {card.icon}
                </div>
                <div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 sm:text-sm">{card.label}</div>
                  <div className="text-lg font-semibold sm:text-xl">{card.value}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="px-2 text-base font-semibold">Shops Status</h3>
              <div className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
                {shops.length === 0 ? (
                  <div className="px-2 py-6 text-center text-sm text-zinc-500">No shops found.</div>
                ) : (
                  shops.map((s) => {
                    const status = (s.status || "").toLowerCase();
                    const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown";
                    const chip =
                      status === "open"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : status === "closed"
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                        : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200";
                    return (
                      <div key={`${s.sid}-${s.name}`} className="grid grid-cols-1 items-start gap-1 px-2 py-3 sm:grid-cols-3 sm:items-center sm:gap-2">
                        <div className="text-sm font-medium">{s.name}</div>
                        <div className="flex sm:justify-center">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${chip}`}>{label}</span>
                        </div>
                        <div className="text-sm text-zinc-700 dark:text-zinc-300 sm:text-right">{s.owner_name || s.email || "-"}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
            <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="px-2 text-base font-semibold">Pending Updates</h3>
              <div className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
                {pending.length === 0 ? (
                  <div className="px-2 py-6 text-center text-sm text-zinc-500">No pending updates.</div>
                ) : (
                  pending.map((p) => {
                    const keys = Object.keys(p.changes || {});
                    const summary =
                      keys.length === 0
                        ? "No details"
                        : keys.includes("message")
                        ? String((p.changes as Record<string, unknown>)["message"] || "").slice(0, 120)
                        : keys.join(", ");
                    return (
                      <div key={p.id} className="grid grid-cols-1 items-start gap-1 px-2 py-3 sm:grid-cols-3 sm:items-center sm:gap-2">
                        <div className="text-sm font-medium">{p.shop_name || p.sid}</div>
                        <div className="text-sm text-zinc-700 dark:text-zinc-300 sm:text-center">{summary || "-"}</div>
                        <div className="flex sm:justify-end">
                          <a
                            href="/admin/pending"
                            className="rounded-md bg-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-100"
                          >
                            Manage
                          </a>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        </div>
  );
}

export default function AdminHome() {
  const overview = [
    { label: "Total Shops", value: 10 },
    { label: "Open Shops", value: 6 },
    { label: "Pending Updates", value: 3 },
    { label: "Today’s Visitors", value: 124 },
  ];
  const shops = [
    { name: "Shop - A", status: "Open", owner: "Alex" },
    { name: "Shop - B", status: "Open", owner: "Jon" },
    { name: "Shop - C", status: "Closed", owner: "Amy" },
    { name: "Shop - D", status: "Closed", owner: "Zai" },
  ];
  const pending = [
    { shop: "Noodle House", change: "Menu change", action: "Approve" },
    { shop: "Menu change", change: "Update", action: "Reject" },
    { shop: "Spic Corner", change: "Menu change", action: "Delete" },
    { shop: "Menu change", change: "Update", action: "Delete" },
  ];
  return (
        <div className="px-8 py-6">
          <h2 className="text-lg font-semibold">Overview</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {overview.map((card) => (
              <div key={card.label} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="h-10 w-10 rounded-md bg-zinc-100 dark:bg-zinc-800" />
                <div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">{card.label}</div>
                  <div className="text-xl font-semibold">{card.value}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="px-2 text-base font-semibold">Shops Status</h3>
              <div className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
                {shops.map((s) => (
                  <div key={s.name} className="grid grid-cols-3 items-center gap-2 px-2 py-3">
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="flex justify-center">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${s.status === "Open" ? "bg-teal-100 text-teal-700" : "bg-rose-100 text-rose-700"}`}>{s.status}</span>
                    </div>
                    <div className="text-right text-sm text-zinc-700 dark:text-zinc-300">{s.owner}</div>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="px-2 text-base font-semibold">Pending Updates</h3>
              <div className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
                {pending.map((p, i) => (
                  <div key={`${p.shop}-${i}`} className="grid grid-cols-3 items-center gap-2 px-2 py-3">
                    <div className="text-sm font-medium">{p.shop}</div>
                    <div className="text-center text-sm text-zinc-700 dark:text-zinc-300">{p.change}</div>
                    <div className="flex justify-end gap-2">
                      {p.action === "Approve" && (
                        <button className="rounded-md bg-teal-600 px-3 py-1 text-xs font-semibold text-white">Approve</button>
                      )}
                      {p.action === "Reject" && (
                        <button className="rounded-md bg-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">Reject</button>
                      )}
                      {p.action === "Delete" && (
                        <button className="rounded-md bg-rose-500 px-3 py-1 text-xs font-semibold text-white">Delete</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
  );
}
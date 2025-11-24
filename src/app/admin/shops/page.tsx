import Link from "next/link";
export default async function AdminShops() {
  const res = await fetch("http://localhost:3000/api/shops", { cache: "no-store" });
  const rows: { sid: string; name: string; status: string; owner_name: string | null; owner_email: string | null }[] = res.ok ? await res.json() : [];
  return (
    <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Shops Management</h2>
            <Link href="/admin/shops/new" className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800">
              <span className="inline-block h-4 w-4 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              Add Shop
            </Link>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="grid grid-cols-4 gap-2 border-b border-zinc-200 px-4 py-3 text-sm font-semibold dark:border-zinc-800">
              <div>Name</div>
              <div>Status</div>
              <div>Owner</div>
              <div className="text-right">Actions</div>
            </div>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {rows.map((s) => (
                <div key={s.sid} className="grid grid-cols-4 items-center gap-2 px-4 py-3">
                  <div className="text-sm font-medium">{s.name}</div>
                  <div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${s.status.toLowerCase() === "open" ? "bg-teal-100 text-teal-700" : "bg-rose-100 text-rose-700"}`}>{s.status}</span>
                  </div>
                  <div className="text-sm text-zinc-700 dark:text-zinc-300">
                    {s.owner_name || "-"}
                    {s.owner_email ? <span className="ml-2 text-xs text-zinc-500">{s.owner_email}</span> : null}
                  </div>
                  <div className="flex justify-end">
                    <Link href={`/admin/shops/${s.sid}`} className="rounded-md bg-teal-600 px-3 py-1 text-xs font-semibold text-white">Edit</Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
    </div>
  );
}
export default async function AdminOwners() {
  const res = await fetch("http://localhost:3000/api/owners", { cache: "no-store" });
  const rows: { uid: string; email: string; role: string; created_at: string; shops: string | null }[] = res.ok ? await res.json() : [];

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Shop Owners</h2>
        {/* We can add "Add Owner" button here later if needed */}
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid grid-cols-4 gap-2 border-b border-zinc-200 px-4 py-3 text-sm font-semibold dark:border-zinc-800">
          <div>Email</div>
          <div>Role</div>
          <div>Shops</div>
          <div className="text-right">Joined Date</div>
        </div>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-500">No shop owners found.</div>
          ) : (
            rows.map((u) => (
              <div key={u.uid} className="grid grid-cols-4 items-center gap-2 px-4 py-3">
                <div className="text-sm font-medium">{u.email}</div>
                <div>
                  <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                    {u.role}
                  </span>
                </div>
                <div className="text-sm text-zinc-700 dark:text-zinc-300">
                  {u.shops || "-"}
                </div>
                <div className="text-right text-sm text-zinc-500">
                  {new Date(u.created_at).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

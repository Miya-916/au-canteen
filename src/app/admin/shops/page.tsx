import Link from "next/link";
import ShopList from "./ShopList";

export default async function AdminShops() {
  const res = await fetch("http://localhost:3000/api/shops", { cache: "no-store" });
  const rows: { sid: string; name: string; status: string; owner_name: string | null; owner_email: string | null; cuisine: string | null; address: string | null; category: string | null }[] = res.ok ? await res.json() : [];
  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">Shops Management</h2>
            <Link href="/admin/shops/new" className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800">
              <span className="inline-block h-4 w-4 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              Add Shop
            </Link>
          </div>
          <ShopList shops={rows} />
    </div>
  );
}

import Link from "next/link";
import ShopList from "./ShopList";
import { listShops } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminShops() {
  const rows = await listShops();
  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">Shops Management</h2>
            <Link href="/admin/shops/new" className="flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              Add Shop
            </Link>
          </div>
          <ShopList shops={rows} />
    </div>
  );
}

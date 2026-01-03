import Link from "next/link";
import ShopGallery from "./ShopGallery";

export default async function CustomerHome() {
  const res = await fetch("http://localhost:3000/api/shops", { cache: "no-store" });
  const shops: {
    sid: string;
    name: string;
    status: string;
    owner_name: string | null;
    owner_email: string | null;
    cuisine: string | null;
    address: string | null;
    category: string | null;
    image_url?: string | null;
  }[] = res.ok ? await res.json() : [];
  const top = shops.slice(0, 3);
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">AU CANTEEN</h1>
          <Link
            href="/login"
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          >
            Switch Account
          </Link>
        </div>
        <ShopGallery allShops={shops} topShops={top} />
      </div>
    </div>
  );
}

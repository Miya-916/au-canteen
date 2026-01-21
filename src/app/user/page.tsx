import Link from "next/link";
import Image from "next/image";
import ShopGallery from "./ShopGallery";
import AUHero from "./aaa.jpg";
import Logo from "./logo.png";

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
      <section id="home" className="relative w-full overflow-hidden">
        <div className="absolute inset-0">
          <Image src={AUHero} alt="Canteen" fill priority className="object-cover" sizes="100vw" />
          <div className="absolute inset-0 bg-black/55" />
        </div>
        <div className="relative border-b border-white/15 bg-[#8b0000]/85 backdrop-blur">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 overflow-hidden rounded-full bg-white/90">
                  <Image src={Logo} alt="University logo" fill sizes="40px" className="object-contain p-1" />
                </div>
                <div className="text-base font-bold tracking-wide text-white">AU CANTEEN</div>
              </div>
              <div className="flex items-center gap-6">
                <a href="#home" className="text-sm font-medium text-white/90 hover:text-white">
                  Home
                </a>
                <a href="#about" className="text-sm font-medium text-white/90 hover:text-white">
                  About Us
                </a>
                <Link
                  href="/user/orders"
                  className="rounded-md border border-white/25 bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/15"
                >
                  Food Orders
                </Link>
                <Link
                  href="/login"
                  className="rounded-md border border-white/25 bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/15"
                >
                  Switch Account
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mx-auto flex min-h-[380px] max-w-6xl items-center px-6 py-10 sm:min-h-[520px] sm:py-14">
          <div className="max-w-2xl">
              <h1 className="text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
                Welcome to AU CANTEEN
              </h1>
              <p className="mt-3 text-base leading-7 text-white/85 sm:text-lg">
                Explore stalls, browse menus, and order your favorites.
              </p>
              <div className="mt-6">
                <a
                  href="#shops"
                  className="inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
                >
                  Browse Shops
                </a>
              </div>
          </div>
        </div>
      </section>

      <main id="shops" className="mx-auto max-w-6xl px-6 py-8">
        <ShopGallery allShops={shops} topShops={top} />
      </main>

      <section id="about" className="border-t border-zinc-200 bg-white py-12 dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">About Us</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
            AU CANTEEN helps students and staff quickly discover shops and menus in the university canteen.
          </p>
        </div>
      </section>
    </div>
  );
}

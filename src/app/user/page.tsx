import Link from "next/link";
import Image from "next/image";
import ShopGallery from "./ShopGallery";
import AUHero from "./aaa.jpg";
import Logo from "./logo.png";
import HeroCarousel from "./HeroCarousel";
import TopSearch from "./TopSearch";

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
      <section id="home" className="relative w-full overflow-hidden pt-[56px]">
        <div className="fixed inset-x-0 top-0 z-50 w-full border-b border-white/15 bg-[#8b0000]/85 backdrop-blur">
          <div className="w-full px-4 sm:px-6">
            <div className="flex items-center justify-between gap-3 py-2">
              <div className="flex items-center gap-3 shrink-0">
                <div className="relative h-9 w-9 overflow-hidden rounded-full bg-white/90">
                  <Image src={Logo} alt="University logo" fill sizes="40px" className="object-contain p-1" />
                </div>
                <div className="text-base font-bold tracking-wide text-white">AU CANTEEN</div>
              </div>
              <div className="flex-1 flex justify-center">
                <div className="w-full max-w-md">
                  <TopSearch />
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0 mr-auto">
                <a href="#home" className="text-sm font-medium text-white/90 hover:text-white">
                  Home
                </a>
                <a href="#about" className="text-sm font-medium text-white/90 hover:text-white">
                  About Us
                </a>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <Link
                  href="/user/orders"
                  className="rounded-md border border-white/25 bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/15"
                >
                  Food Orders
                </Link>
                <Link
                  href="/user/favorites"
                  className="rounded-md border border-white/25 bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/15"
                >
                  ⭐ Favorite
                </Link>
                <Link
                  href="/login?logout=1"
                  className="rounded-md border border-white/25 bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/15"
                >
                  Log Out
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mx-auto min-h-[500px] sm:min-h-[600px] max-w-8xl px-0 py-6 sm:py-14">
          <div className="px-6">
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Welcome to AU CANTEEN
            </h1>
            <p className="mt-2 text-sm leading-7 text-white/85 sm:text-base">
              Explore stalls, browse menus, and order your favorites.
            </p>
          </div>
          <HeroCarousel
            defaultUrl={AUHero.src}
            defaultLabel="AU Canteen"
            images={
              shops
                .filter((s) => !!s.image_url)
                .map((s) => ({ url: String(s.image_url), label: s.name }))
            }
          />
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

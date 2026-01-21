import Link from "next/link";
import { getShop, listShops } from "@/lib/db";
import EditShopForm from "./EditShopForm";

export default async function EditShopPage({ params }: { params: Promise<{ sid: string }> }) {
  const { sid } = await params;
  type ShopRow = {
    sid: string;
    name?: string | null;
    status?: string | null;
    owner_name?: string | null;
    email?: string | null;
    cuisine?: string | null;
    open_date?: string | null;
    phone?: string | null;
    line_id?: string | null;
    address?: string | null;
    category?: string | null;
    image_url?: string | null;
    qr_url?: string | null;
  };
  let s: {
    name?: string | null;
    status?: string | null;
    owner_name?: string | null;
    email?: string | null;
    cuisine?: string | null;
    open_date?: string | null;
    phone?: string | null;
    line_id?: string | null;
    address?: string | null;
    category?: string | null;
    image_url?: string | null;
    qr_url?: string | null;
  } | null = sid ? await getShop(sid) : null;
  if (!s && sid) {
    const rows = (await listShops()) as ShopRow[];
    const found = rows.find((r) => r.sid === sid);
    s = found
      ? {
          name: found.name,
          status: found.status,
          owner_name: found.owner_name,
          email: found.email,
          cuisine: found.cuisine,
          open_date: found.open_date,
          phone: found.phone,
          line_id: found.line_id,
          address: found.address,
          category: found.category,
          image_url: found.image_url,
          qr_url: found.qr_url,
        }
      : null;
  }
  const name = s?.name || "";
  const status = (s?.status || "open").toLowerCase();
  const ownerName = (s?.owner_name ?? "") as string;
  const ownerEmail = (s?.email ?? "") as string;
  const cuisine = (s?.cuisine ?? "") as string;
  const openDate = s?.open_date ? new Date(s.open_date).toISOString().split('T')[0] : "";
  const phone = (s?.phone ?? "") as string;
  const lineId = (s?.line_id ?? "") as string;
  const address = (s?.address ?? "") as string;
  const category = (s?.category ?? "") as string;
  const imageUrl = (s?.image_url ?? "") as string;
  const qrUrl = (s?.qr_url ?? "") as string;
  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex items-center gap-4">
        <Link 
          href="/admin/shops" 
          title="Back to Shops Management"
          className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"/>
            <path d="M12 19l-7-7 7-7"/>
          </svg>
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Shop</h1>
      </div>
      <EditShopForm
        sid={sid}
        name={name}
        status={status}
        ownerName={ownerName}
        ownerEmail={ownerEmail}
        cuisine={cuisine}
        openDate={openDate}
        phone={phone}
        lineId={lineId}
        address={address}
        category={category}
        imageUrl={imageUrl}
        qrUrl={qrUrl}
      />
      <div className="mt-4 max-w-xl">
        <Link href="/admin/shops" className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold">Cancel</Link>
      </div>
    </div>
  );
}

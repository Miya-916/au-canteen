"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function EditShopPage() {
  const router = useRouter();
  const params = useParams();
  const sid = String(params?.sid || "");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("open");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [openDate, setOpenDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const sidEff = sid || (typeof window !== "undefined" ? window.location.pathname.split("/").filter(Boolean).pop() || "" : "");
    if (!sidEff) return () => { active = false };
    (async () => {
      const res = await fetch(`/api/shops/${encodeURIComponent(sidEff)}`);
      if (!res.ok) return;
      const s = await res.json();
      if (!active) return;
      console.log("EditShopPage: data", s);
      const ownerNameIncoming = (s.owner_name ?? s.ownerName ?? "") as string;
      const ownerEmailIncoming = (s.owner_email ?? s.ownerEmail ?? "") as string;
      setName(s.name || "");
      setStatus((s.status || "open").toLowerCase());
      setOwnerName(ownerNameIncoming);
      setOwnerEmail(ownerEmailIncoming);
      setCuisine(s.cuisine || "");
      setOpenDate(s.open_date ? String(s.open_date).slice(0, 10) : "");
    })();
    return () => {
      active = false;
    };
  }, [sid]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/shops/${sid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          status,
          ownerName,
          ownerEmail: ownerEmail ? ownerEmail.trim().toLowerCase() : undefined,
          ownerPassword: ownerEmail ? ownerPassword : undefined,
          cuisine: cuisine || undefined,
          openDate: openDate || undefined,
        }),
      });
      if (!res.ok) {
        const out = await res.json().catch(() => ({}));
        throw new Error(out?.error || "Failed to save shop");
      }
      router.push("/admin/shops");
    } catch (err: unknown) {
      const msg = typeof err === "object" && err && (err as { message?: string }).message;
      setError(msg || "Failed to save shop");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-8 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit Shop</h1>
      <form onSubmit={onSubmit} className="mt-4 max-w-xl space-y-4">
        {error && <div className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-800">{error}</div>}
        <div>
          <label className="block text-sm font-medium">Shop Name</label>
          <input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium">Status</label>
          <select className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Owner Name</label>
          <input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium">Cuisine</label>
          <input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2" value={cuisine} onChange={(e) => setCuisine(e.target.value)} placeholder="Chinese, Thai, etc." />
        </div>
        <div>
          <label className="block text-sm font-medium">Open Date</label>
          <input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2" type="date" value={openDate} onChange={(e) => setOpenDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium">Owner Email (optional)</label>
          <input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2" type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
        </div>
        {ownerEmail && (
          <div>
            <label className="block text-sm font-medium">Owner Password</label>
            <input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2" type="password" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} />
          </div>
        )}
        <div className="pt-2">
          <button disabled={loading} className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{loading ? "Saving..." : "Save"}</button>
          <Link href="/admin/shops" className="ml-3 rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
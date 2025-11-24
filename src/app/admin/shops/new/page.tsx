"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function NewShopPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [status, setStatus] = useState("open");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          status,
          ownerEmail: ownerEmail ? ownerEmail.trim().toLowerCase() : undefined,
          ownerName,
          ownerPassword: ownerEmail ? ownerPassword : undefined,
        }),
      });
      if (!res.ok) {
        const out = await res.json().catch(() => ({}));
        throw new Error(out?.error || "Failed to create shop");
      }
      router.push("/admin/shops");
    } catch (err: unknown) {
      const msg = typeof err === "object" && err && (err as { message?: string }).message;
      setError(msg || "Failed to create shop");
    } finally {
      setLoading(false);
    }
  }

  return (
        <div className="px-8 py-6">
          <h1 className="text-2xl font-semibold tracking-tight">Add Shop</h1>
          <form onSubmit={onSubmit} className="max-w-xl space-y-4">
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
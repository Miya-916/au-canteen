"use client";
import { useState } from "react";

export default function AdminSetupPage() {
  const [email, setEmail] = useState("");
  const [secret, setSecret] = useState("");
  const [role, setRole] = useState("admin");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/users/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-setup-secret": secret },
        body: JSON.stringify({ email, role }),
      });
      if (res.ok) {
        const data = await res.json();
        setMsg(`Promoted ${email} to ${data.role}`);
      } else {
        const err = await res.json().catch(() => ({}));
        setMsg(err?.error || "Failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Admin Setup</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Promote an existing account by email.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-0 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Secret</label>
            <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-0 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-0 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
              <option value="admin">admin</option>
              <option value="owner">owner</option>
              <option value="customer">customer</option>
            </select>
          </div>
          {msg && <div className="rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">{msg}</div>}
          <button type="submit" disabled={loading} className="w-full rounded-md bg-black px-4 py-2 text-white disabled:opacity-60 dark:bg-zinc-200 dark:text-black">
            {loading ? "Saving..." : "Promote"}
          </button>
        </form>
      </div>
    </div>
  );
}
"use client";
import { useEffect, useState } from "react";
 
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestedRole, setRequestedRole] = useState("");
  const roleLabel =
    requestedRole === "admin" ? "Admin" : requestedRole === "owner" ? "Shop Owner" : requestedRole === "customer" ? "Customer" : "";
  
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setRequestedRole((params.get("role") || "").toLowerCase());
      if (params.get("logout") === "1") {
        fetch("/api/auth/logout", { method: "POST" }).finally(() => {
          // stay on login page
        });
      }
    } catch {}
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to sign in");
      }
      const out = await res.json();
      const role: string = (out?.role || "customer").toLowerCase();
      
      // Force a hard navigation or refresh to ensure cookies are picked up
      router.refresh();

      if (role === "admin") {
        router.push("/admin");
      } else if (role === "owner" || role === "shop") {
        router.push("/owner");
      } else {
        router.push("/user");
      }
    } catch (err: unknown) {
      const msg = typeof err === "object" && err && (err as { message?: string }).message;
      setError(msg || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {roleLabel ? `${roleLabel} Login` : "Login"}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {requestedRole === "admin"
            ? "Sign in with your admin account."
            : requestedRole === "owner"
            ? "Sign in with your shop owner account."
            : requestedRole === "customer"
            ? "Sign in to order food and view your orders."
            : "Admin and Shop Owners sign in here. Customers can also sign in."}
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-0 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-0 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              required
            />
          </div>
          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-black px-4 py-2 text-white disabled:opacity-60 dark:bg-zinc-200 dark:text-black"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          <span>New customer?</span> <Link href="/register" className="font-medium text-black underline underline-offset-2 dark:text-zinc-200">Create an account</Link>
        </div>
      </div>
    </div>
  );
}

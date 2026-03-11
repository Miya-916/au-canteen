"use client";
import { useEffect, useState } from "react";
 
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { GoogleSignInButton } from "./GoogleSignInButton";

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

  async function onGoogleSuccess(credential: string) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to sign in with Google");
      }
      const out = await res.json();
      const role: string = (out?.role || "customer").toLowerCase();
      
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
      setError(msg || "Failed to sign in with Google");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-50 dark:bg-black">
      <div className="pointer-events-none absolute inset-0">
        <Image src="/background.JPG" alt="" fill sizes="100vw" className="object-cover object-[center_5%] opacity-80" priority />
        <div className="absolute inset-0 bg-white/30 dark:bg-black/50" />
      </div>
      <div className="absolute left-4 top-4 z-20 sm:left-6 sm:top-6">
        <Link
          href="/"
          className="inline-flex items-center rounded-md border border-zinc-300 bg-white/90 px-3 py-2 text-sm font-medium text-zinc-800 backdrop-blur hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          <span>Back</span>
        </Link>
      </div>
      <div className="relative z-10 mx-auto flex min-h-screen max-w-lg items-center justify-center px-4 py-10">
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
            {(requestedRole === "customer" || requestedRole === "owner") && (
              <div className="mt-2 text-xs">
                <Link href="/forgot-password" className="text-zinc-600 underline underline-offset-2 dark:text-zinc-400">
                  Forgot password?
                </Link>
              </div>
            )}
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

        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          <span className="text-xs text-zinc-500">OR</span>
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        </div>

        <GoogleSignInButton 
          onSuccess={onGoogleSuccess} 
          onError={() => setError("Google Sign In failed")} 
        />

        {requestedRole !== "admin" && requestedRole !== "owner" && (
          <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            <span>Don&apos;t have an account?</span>{" "}
            <Link
              href="/register?logout=1"
              className="font-medium text-black underline underline-offset-2 dark:text-zinc-200"
            >
              Register
            </Link>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

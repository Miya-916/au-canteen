"use client";
import { useState } from "react";
 
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GoogleSignInButton } from "../login/GoogleSignInButton";

export default function RegisterPage() {
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password, role: "customer" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to register");
      }
      setMsg("Account created. Please check your email and click the verification link before signing in.");
      setTimeout(() => router.push("/login?role=customer"), 1500);
    } catch (err: unknown) {
      const msg = typeof err === "object" && err && (err as { message?: string }).message;
      setError(msg || "Failed to register");
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
      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        if (data?.requiresVerification) {
          setMsg("Account created. Please check your email and click the verification link before signing in.");
          setLoading(false);
          return;
        }
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to sign up with Google");
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
      setError(msg || "Failed to sign up with Google");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Customer Register</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Only customers can self-register. Admin will create other roles.</p>
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
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-0 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              required
            />
          </div>
          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</div>}
          {msg && <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">{msg}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-black px-4 py-2 text-white disabled:opacity-60 dark:bg-zinc-200 dark:text-black"
          >
            {loading ? "Creating account..." : "Create Account"}
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
        <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          <span>Already have an account?</span> <Link href="/login" className="font-medium text-black underline underline-offset-2 dark:text-zinc-200">Sign in</Link>
        </div>
      </div>
    </div>
  );
}

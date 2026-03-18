"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

function VerifyEmailContent() {
  const params = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const token = params.get("token");
    if (!token) {
      setError("Missing verification token");
      setLoading(false);
      return;
    }

    const run = async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || "Failed to verify email");
        }
        if (data?.alreadyVerified) {
          setMsg("Your account is already verified. You can sign in now.");
        } else {
          setMsg("Your account has been verified and activated. You can sign in now.");
        }
      } catch (e: unknown) {
        const message = typeof e === "object" && e && (e as { message?: string }).message;
        setError(message || "Failed to verify email");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [params]);

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
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Email Verification</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {loading ? "Verifying your account..." : "Verification complete."}
        </p>
        {error && <div className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</div>}
        {msg && <div className="mt-6 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">{msg}</div>}
        <div className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/login?role=customer" className="font-medium text-black underline underline-offset-2 dark:text-zinc-200">
            Go to login
          </Link>
        </div>
      </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            Loading...
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}

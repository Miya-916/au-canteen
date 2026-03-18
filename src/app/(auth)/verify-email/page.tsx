"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

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
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
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

"use client";
import { Suspense, useEffect, useState } from "react";
 import { useRouter, useSearchParams } from "next/navigation";
 import Link from "next/link";
 import Image from "next/image";
 
function ResetPasswordForm() {
   const router = useRouter();
   const params = useSearchParams();
   const [token, setToken] = useState<string | null>(null);
   const [password, setPassword] = useState("");
   const [confirm, setConfirm] = useState("");
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [msg, setMsg] = useState<string | null>(null);
 
   useEffect(() => {
     const t = params.get("token");
     setToken(t);
   }, [params]);
 
   async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
     e.preventDefault();
     setError(null);
     setMsg(null);
     if (!token) {
       setError("Missing reset token");
       return;
     }
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
       const res = await fetch("/api/auth/reset-password", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ token, password }),
       });
       const data = await res.json().catch(() => ({}));
       if (!res.ok) {
         throw new Error(data?.error || "Failed to reset password");
       }
       setMsg("Password updated successfully. Redirecting to login...");
       setTimeout(() => router.push("/login?role=customer"), 1500);
     } catch (err: unknown) {
       const message = typeof err === "object" && err && (err as { message?: string }).message;
       setError(message || "Failed to reset password");
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
         <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Reset Password</h1>
         <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
           Enter your new password below.
         </p>
         <form onSubmit={onSubmit} className="mt-6 space-y-4">
           <div>
             <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">New Password</label>
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
             {loading ? "Updating..." : "Reset Password"}
           </button>
         </form>
         <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
           <Link href="/login?role=customer" className="font-medium text-black underline underline-offset-2 dark:text-zinc-200">
             Back to login
           </Link>
         </div>
       </div>
      </div>
     </div>
   );
 }

export default function ResetPasswordPage() {
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
      <ResetPasswordForm />
    </Suspense>
  );
}

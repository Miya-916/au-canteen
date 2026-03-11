 "use client";
 import { useState } from "react";
 import Link from "next/link";
 
 export default function ForgotPasswordPage() {
   const [email, setEmail] = useState("");
   const [loading, setLoading] = useState(false);
   const [msg, setMsg] = useState<string | null>(null);
   const [error, setError] = useState<string | null>(null);
 
   async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
     e.preventDefault();
     setError(null);
     setMsg(null);
     setLoading(true);
     try {
       const res = await fetch("/api/auth/forgot-password", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ email: email.trim().toLowerCase() }),
       });
       const data = await res.json().catch(() => ({}));
       if (!res.ok) {
         throw new Error(data?.error || "Failed to send reset email");
       }
       setMsg("Reset link has been sent.");
     } catch (err: unknown) {
       const message = typeof err === "object" && err && (err as { message?: string }).message;
       setError(message || "Failed to send reset email");
     } finally {
       setLoading(false);
     }
   }
 
   return (
     <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
       <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
         <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Forgot Password</h1>
         <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
           Enter your email to receive a password reset link.
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
           {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</div>}
           {msg && <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">{msg}</div>}
           <button
             type="submit"
             disabled={loading}
             className="w-full rounded-md bg-black px-4 py-2 text-white disabled:opacity-60 dark:bg-zinc-200 dark:text-black"
           >
             {loading ? "Sending..." : "Send Reset Link"}
           </button>
         </form>
         <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
           <Link href="/login?role=customer" className="font-medium text-black underline underline-offset-2 dark:text-zinc-200">
             Back to login
           </Link>
         </div>
       </div>
     </div>
   );
 }

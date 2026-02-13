"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Logo from "./user/logo.png";

type Role = "admin" | "owner" | "customer";

const BRAND_NAME = "AU CANTEEN";

const roleLabel: Record<Role, string> = {
  admin: "Admin",
  owner: "Shop Owner",
  customer: "Customer",
};

export default function Home() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("customer");

  const loginHref = useMemo(() => `/login?role=${role}`, [role]);
  const canRegister = role === "customer";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="mx-auto flex min-h-screen max-w-lg items-center justify-center px-4 py-10">
        <main className="w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
          <div className="flex flex-col items-center text-center">
            <div className="relative h-14 w-14 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <Image src={Logo} alt="AU Canteen logo" fill sizes="56px" className="object-contain p-2" priority />
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {BRAND_NAME}
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Sign in to continue, or create a customer account.
            </p>
          </div>

          <div className="mt-7 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Choose role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="admin">{roleLabel.admin}</option>
                <option value="owner">{roleLabel.owner}</option>
                <option value="customer">{roleLabel.customer}</option>
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link
                href={loginHref}
                className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-black px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-200 dark:text-black dark:hover:bg-white"
              >
                Log In
              </Link>
              <button
                type="button"
                disabled={!canRegister}
                onClick={() => router.push("/register")}
                className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                Sign Up
              </button>
            </div>

            {!canRegister ? (
              <div className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                Only customers can sign up here. Admin creates other roles.
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}

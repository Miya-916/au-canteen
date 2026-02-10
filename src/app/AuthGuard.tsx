"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function AuthGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok && active) {
          // 只在用户尚未在登录页面时才提示和跳转
          if (pathname !== "/login") {
            setToast("Your session has expired. Logging out...");
            setTimeout(async () => {
              if (!active) return;
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/login");
            }, 2000);
          }
        }
      } catch {}
    };
    const isPublicPage = pathname === "/" || pathname === "/login" || pathname === "/register";
    if (!isPublicPage) check();
    const id = setInterval(() => {
      if (!isPublicPage) check();
    }, 15000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [router, pathname]);
  return toast ? (
    <div className="fixed inset-x-0 top-4 z-50 flex justify-center">
      <div className="rounded-md bg-black text-white px-4 py-2 shadow-md">
        {toast}
      </div>
    </div>
  ) : null;
}
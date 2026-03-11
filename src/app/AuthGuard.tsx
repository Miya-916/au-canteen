"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function AuthGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const [toast, setToast] = useState<string | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loginByRole =
    pathname.startsWith("/admin")
      ? "/login?role=admin"
      : pathname.startsWith("/owner")
        ? "/login?role=owner"
        : pathname.startsWith("/user")
          ? "/login?role=customer"
          : "/login";
  useEffect(() => {
    let active = true;
    const clearLogoutTimer = () => {
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
        logoutTimerRef.current = null;
      }
    };
    const isAuthed = async () => {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      return res.ok;
    };
    const check = async () => {
      try {
        const ok = await isAuthed();
        if (ok) {
          clearLogoutTimer();
          if (active) setToast(null);
          return;
        }
        if (!active || pathname === "/login") {
          return;
        }
        setToast("Your session has expired. Logging out...");
        if (!logoutTimerRef.current) {
          logoutTimerRef.current = setTimeout(async () => {
            if (!active) return;
            try {
              const stillAuthed = await isAuthed();
              if (stillAuthed) {
                if (active) setToast(null);
                clearLogoutTimer();
                return;
              }
            } catch {}
            await fetch("/api/auth/logout", { method: "POST" });
            router.push(loginByRole);
            clearLogoutTimer();
          }, 2000);
        }
      } catch {}
    };
    const isPublicPage = pathname === "/" || pathname === "/login" || pathname === "/register" || pathname === "/forgot-password" || pathname === "/reset-password";
    if (!isPublicPage) check();
    const id = setInterval(() => {
      if (!isPublicPage) check();
    }, 15000);
    return () => {
      active = false;
      clearInterval(id);
      clearLogoutTimer();
    };
  }, [router, pathname, loginByRole]);
  return toast ? (
    <div className="fixed inset-x-0 top-4 z-50 flex justify-center">
      <div className="rounded-md bg-black text-white px-4 py-2 shadow-md">
        {toast}
      </div>
    </div>
  ) : null;
}

import { NextRequest, NextResponse } from "next/server";

function decodePayload(token: string): { exp?: number; uid?: string; role?: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const b = parts[1];
  try {
    const json = Buffer.from(b.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isProtectedPath(pathname: string) {
  return pathname.startsWith("/admin") || pathname.startsWith("/owner") || pathname.startsWith("/user");
}

function isAuthPath(pathname: string) {
  return pathname === "/login" || pathname === "/register";
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/setup") {
    return NextResponse.next();
  }
  const token = req.cookies.get("access_token")?.value || "";
  const payload = token ? decodePayload(token) : null;
  const now = Math.floor(Date.now() / 1000);

  // Expired or missing token handling for protected routes
  if (isProtectedPath(pathname)) {
    if (!payload || (typeof payload.exp === "number" && payload.exp <= now)) {
      const url = new URL("/login", req.url);
      const res = NextResponse.redirect(url);
      res.cookies.set("access_token", "", { path: "/", maxAge: 0 });
      return res;
    }
  }

  // If visiting auth pages while authenticated, redirect by role
  if (isAuthPath(pathname) && payload && (!payload.exp || payload.exp > now)) {
    const role = payload.role || "customer";
    const dest = role === "admin" ? "/admin" : role === "owner" ? "/owner" : "/user";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/owner/:path*", "/user/:path*", "/login", "/register"],
};
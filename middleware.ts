import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.AUTH_TOKEN_SECRET || "dev-secret");

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (err) {
    return null;
  }
}

function isProtectedPath(pathname: string) {
  return pathname.startsWith("/admin") || pathname.startsWith("/owner") || pathname.startsWith("/user");
}

function isAuthPath(pathname: string) {
  return pathname === "/login" || pathname === "/register";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("access_token")?.value || "";
  
  const payload = token ? await verifyToken(token) : null;
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
  // ONLY redirect if we are sure the token is valid (has exp and future)
  if (isAuthPath(pathname) && payload && typeof payload.exp === "number" && payload.exp > now) {
    const role = (payload.role as string) || "customer";
    const dest = role === "admin" ? "/admin" : role === "owner" ? "/owner" : "/user";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/owner/:path*", "/user/:path*", "/login", "/register"],
};
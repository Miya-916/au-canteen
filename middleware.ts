import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.AUTH_TOKEN_SECRET || "dev-secret");

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret, { clockTolerance: 30 });
    return payload;
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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("access_token")?.value || "";

  // Check for logout parameter on auth pages - allow manual logout via query param
  if (isAuthPath(pathname) && req.nextUrl.searchParams.get("logout") === "1") {
    const res = NextResponse.next();
    res.cookies.set("access_token", "", { path: "/", maxAge: 0 });
    res.cookies.set("token", "", { path: "/", maxAge: 0 });
    return res;
  }
  
  const payload = token ? await verifyToken(token) : null;
  const now = Math.floor(Date.now() / 1000);

  // Expired or missing token handling for protected routes
  if (isProtectedPath(pathname)) {
    if (!payload) {
      const url = new URL("/login", req.url);
      const res = NextResponse.redirect(url);
      res.cookies.set("access_token", "", { path: "/", maxAge: 0 });
      res.cookies.set("token", "", { path: "/", maxAge: 0 });
      return res;
    }

    // STRICT ROLE ENFORCEMENT
    const role = (payload.role as string || "").toLowerCase();
    
    // 1. Admin trying to access non-admin pages?
    if (pathname.startsWith("/admin")) {
      if (role !== "admin") {
        const dest = (role === "owner" || role === "shop") ? "/owner" : "/user";
        return NextResponse.redirect(new URL(dest, req.url));
      }
    }
    
    // 2. Owner trying to access non-owner pages?
    if (pathname.startsWith("/owner") && role !== "owner" && role !== "shop") {
       const dest = role === "admin" ? "/admin" : "/user";
       return NextResponse.redirect(new URL(dest, req.url));
    }

    // 3. Customer trying to access non-customer pages?
    if (pathname.startsWith("/user") && role !== "customer" && role !== "user") {
       const dest = role === "admin" ? "/admin" : "/owner";
       return NextResponse.redirect(new URL(dest, req.url));
    }
  }

  // If visiting auth pages while authenticated, redirect by role
  // ONLY redirect if we are sure the token is valid (has exp and future)
  if (isAuthPath(pathname) && payload && typeof payload.exp === "number" && payload.exp > now) {
    const role = (payload.role as string || "customer").toLowerCase();
    const dest = role === "admin" ? "/admin" : (role === "owner" || role === "shop") ? "/owner" : "/user";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/owner/:path*", "/user/:path*", "/login", "/register"],
};

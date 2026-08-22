import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (!request.cookies.has(ADMIN_SESSION_COOKIE)) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/gate") {
    return NextResponse.next();
  }

  // /api/* is always gated, even for paths that end in something
  // extension-shaped (e.g. /api/media/photos/ivan.jpg) — the blanket
  // "has a file extension" exemption below is only meant for real static
  // files under public/, not dynamic route segments.
  if (pathname.startsWith("/api/")) {
    if (!request.cookies.has(SESSION_COOKIE)) {
      return NextResponse.redirect(new URL("/gate", request.url));
    }
    return NextResponse.next();
  }

  // Static assets (robots.txt, favicon.ico, everything under public/ —
  // images, the maplibre-gl worker script, etc.) — never gated, since
  // module workers in particular won't reliably follow a redirect.
  if (/\.[^/]+$/.test(pathname)) {
    return NextResponse.next();
  }

  if (!request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/gate", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};

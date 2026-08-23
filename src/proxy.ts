import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { evaluate } from "flags/next";
import { SESSION_COOKIE } from "@/lib/session";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-session";
import { demoModeFlag } from "@/lib/flags";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Vercel's Flags Explorer calls this to discover the project's flags --
  // it authenticates itself via FLAGS_SECRET, not a family-session cookie,
  // so it needs to bypass the gate entirely rather than being redirected.
  if (pathname === "/.well-known/vercel/flags") {
    return NextResponse.next();
  }

  // Outside App Router (middleware has no React request scope), the flag
  // needs an explicit request to read cookies/headers from -- evaluate()
  // is the documented way to do that.
  const [isDemo] = await evaluate([demoModeFlag], request);

  // The demo deployment never exposes the admin panel at all -- not even
  // the login page -- so there's nothing here for a public visitor to poke
  // at, and no login form for someone to brute-force.
  if (isDemo && pathname.startsWith("/admin")) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (!request.cookies.has(ADMIN_SESSION_COOKIE)) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next();
  }

  // /gate/years (second login stage) checks for the stage-one cookie
  // itself and redirects back to /gate if it's missing — no need to
  // duplicate that check here.
  if (pathname === "/gate" || pathname === "/gate/years") {
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
  // images, etc.) — never gated.
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

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/gate") {
    return NextResponse.next();
  }

  const hasSession = request.cookies.has(SESSION_COOKIE);
  if (!hasSession) {
    return NextResponse.redirect(new URL("/gate", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Excludes Next internals and any path with a file extension (robots.txt,
  // favicon.ico, everything under public/ — images, the maplibre-gl worker
  // script, etc.) so static assets are never redirected to /gate, which
  // module workers in particular won't reliably follow.
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};

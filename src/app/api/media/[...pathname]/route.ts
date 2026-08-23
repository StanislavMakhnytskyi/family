import { type NextRequest, NextResponse } from "next/server";
import { get, putImage } from "@vercel/blob";
import { SESSION_COOKIE } from "@/lib/session";

// Pre-webp uploads (avatars/media stored before the app started converting
// everything on the way in, or ones uploaded via the plain-put fallback for
// formats putImage rejected) still get served at their original, uncompressed
// size and format. Rather than requiring every one of them to be re-uploaded
// by hand, convert on first read and cache the result as a sibling blob --
// every request after the first hits that cached webp directly, at the cost
// of one extra Blob round trip on the (rare, one-time-per-image) cache miss.
const CONVERTED_SUFFIX = ".converted.webp";
const CONVERT_MAX_WIDTH = 1600; // matches uploadPrivateFile's own "full size" ceiling
const CONVERT_QUALITY = 80;

function serve(stream: ReadableStream<Uint8Array>, contentType: string): NextResponse {
  return new NextResponse(stream, {
    headers: {
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
      // Each pathname's content never changes (uploads always get a fresh,
      // randomly-suffixed pathname) -- safe to let the browser cache this
      // for a full authenticated session and beyond, instead of re-fetching
      // the same photo on every page view.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}

async function servePossiblyConverted(
  pathname: string,
  contentType: string,
  stream: ReadableStream<Uint8Array>,
): Promise<NextResponse> {
  if (!contentType.startsWith("image/") || contentType === "image/webp") {
    return serve(stream, contentType);
  }

  const cachedPathname = `${pathname}${CONVERTED_SUFFIX}`;
  const cached = await get(cachedPathname, { access: "private" }).catch(() => null);
  if (cached && cached.statusCode === 200) {
    return serve(cached.stream, "image/webp");
  }

  try {
    await putImage(cachedPathname, stream, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      optimizeImage: { width: CONVERT_MAX_WIDTH, quality: CONVERT_QUALITY, format: "webp" },
    });
    // Bypass the CDN read cache here -- we just wrote this pathname a
    // moment ago and need to see it, not a possibly-stale miss.
    const converted = await get(cachedPathname, { access: "private", useCache: false });
    if (converted && converted.statusCode === 200) {
      return serve(converted.stream, "image/webp");
    }
  } catch {
    // putImage requires OIDC auth, which isn't guaranteed locally (only on
    // Vercel, or after `vercel env pull`) -- fall through to the original
    // rather than failing the request outright if conversion isn't available.
  }

  // Conversion didn't happen (or its own re-fetch raced with something) --
  // the original stream was already consumed by putImage above, so re-fetch
  // it fresh rather than trying to reuse the drained stream.
  const original = await get(pathname, { access: "private" });
  if (!original || original.statusCode !== 200) {
    return new NextResponse("Not found", { status: 404 });
  }
  return serve(original.stream, original.blob.contentType);
}

// Re-checks auth here even though proxy.ts already gates /api/* — Vercel's
// own private-storage docs recommend against relying on middleware alone
// for this.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pathname: string[] }> },
) {
  if (!request.cookies.has(SESSION_COOKIE)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { pathname: segments } = await params;
  const pathname = segments.join("/");

  const result = await get(pathname, { access: "private" });
  if (!result || result.statusCode !== 200) {
    return new NextResponse("Not found", { status: 404 });
  }

  return servePossiblyConverted(pathname, result.blob.contentType, result.stream);
}

import { type NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { SESSION_COOKIE } from "@/lib/session";

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

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-cache",
    },
  });
}

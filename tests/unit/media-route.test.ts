import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const getMock = vi.fn();
const putImageMock = vi.fn();

vi.mock("@vercel/blob", () => ({
  get: (...args: unknown[]) => getMock(...args),
  putImage: (...args: unknown[]) => putImageMock(...args),
}));

const { GET } = await import("@/app/api/media/[...pathname]/route");
const { SESSION_COOKIE } = await import("@/lib/session");

function makeRequest(withSession = true): NextRequest {
  const headers = new Headers();
  if (withSession) headers.set("cookie", `${SESSION_COOKIE}=abc`);
  return new NextRequest("http://localhost/api/media/people/x/photo.png", { headers });
}

function fakeStream(): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2, 3]));
      controller.close();
    },
  });
}

function callGet(request: NextRequest) {
  return GET(request, {
    params: Promise.resolve({ pathname: ["people", "x", "photo.png"] }),
  });
}

beforeEach(() => {
  getMock.mockReset();
  putImageMock.mockReset();
});

describe("GET /api/media/[...pathname]", () => {
  it("returns 401 without a session cookie", async () => {
    const response = await callGet(makeRequest(false));
    expect(response.status).toBe(401);
    expect(getMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the blob doesn't exist", async () => {
    getMock.mockResolvedValueOnce(null);
    const response = await callGet(makeRequest());
    expect(response.status).toBe(404);
  });

  it("serves an already-webp image without attempting conversion", async () => {
    getMock.mockResolvedValueOnce({
      statusCode: 200,
      stream: fakeStream(),
      blob: { contentType: "image/webp" },
    });
    const response = await callGet(makeRequest());
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(putImageMock).not.toHaveBeenCalled();
  });

  it("serves a non-image (e.g. a PDF document) without attempting conversion", async () => {
    getMock.mockResolvedValueOnce({
      statusCode: 200,
      stream: fakeStream(),
      blob: { contentType: "application/pdf" },
    });
    const response = await callGet(makeRequest());
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(putImageMock).not.toHaveBeenCalled();
  });

  it("serves the cached webp conversion on a cache hit, without re-converting", async () => {
    getMock
      .mockResolvedValueOnce({ statusCode: 200, stream: fakeStream(), blob: { contentType: "image/png" } })
      .mockResolvedValueOnce({ statusCode: 200, stream: fakeStream(), blob: { contentType: "image/webp" } });

    const response = await callGet(makeRequest());
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(putImageMock).not.toHaveBeenCalled();
  });

  it("converts to webp and caches it on a cache miss", async () => {
    getMock
      .mockResolvedValueOnce({ statusCode: 200, stream: fakeStream(), blob: { contentType: "image/png" } })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ statusCode: 200, stream: fakeStream(), blob: { contentType: "image/webp" } });
    putImageMock.mockResolvedValueOnce({ pathname: "people/x/photo.png.converted.webp" });

    const response = await callGet(makeRequest());
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(putImageMock).toHaveBeenCalledTimes(1);
    const [cachedPathname, , options] = putImageMock.mock.calls[0];
    expect(cachedPathname).toBe("people/x/photo.png.converted.webp");
    expect(options.optimizeImage).toMatchObject({ quality: 80, format: "webp" });
  });

  it("falls back to serving the original if conversion fails (e.g. no OIDC auth locally)", async () => {
    getMock
      .mockResolvedValueOnce({ statusCode: 200, stream: fakeStream(), blob: { contentType: "image/png" } })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ statusCode: 200, stream: fakeStream(), blob: { contentType: "image/png" } });
    putImageMock.mockRejectedValueOnce(new Error("no OIDC token"));

    const response = await callGet(makeRequest());
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
  });
});

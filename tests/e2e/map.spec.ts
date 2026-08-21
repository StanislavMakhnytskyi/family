import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("burial map opens and actually renders tiles", async ({ page }) => {
  await login(page);
  await page.getByText("Іван Ковальський").click();
  await expect(page).toHaveURL(/\/person\/ivan$/);

  const workerResponse = page.waitForResponse((res) =>
    res.url().endsWith("/maplibre-gl-worker.mjs"),
  );

  await page.getByRole("button", { name: "Відкрити на карті" }).click();

  // maplibre-gl resolves its worker script relative to its own bundled chunk
  // URL by default, which Turbopack/Webpack break (the worker request 404s
  // as HTML and the map silently never renders). We serve our own copy from
  // public/ and point maplibre at it via setWorkerUrl() — assert both the
  // request succeeds as real JS, and that the canvas isn't just blank.
  const workerRes = await workerResponse;
  expect(workerRes.status()).toBe(200);
  expect(workerRes.headers()["content-type"]).toContain("javascript");

  const canvas = page.locator(".maplibregl-canvas");
  await expect(canvas).toBeVisible();
  await expect(page.locator(".maplibregl-marker")).toBeVisible();

  await expect
    .poll(
      () =>
        canvas.evaluate((el) => {
          const c = el as HTMLCanvasElement;
          const gl = (c.getContext("webgl2") ||
            c.getContext("webgl")) as WebGLRenderingContext | null;
          if (!gl) return -1;
          const w = c.width,
            h = c.height;
          const pixels = new Uint8Array(w * h * 4);
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          const colors = new Set<string>();
          for (let i = 0; i < pixels.length; i += 4) {
            colors.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`);
            if (colors.size > 3) break;
          }
          return colors.size;
        }),
      { timeout: 10_000 },
    )
    // A blank/never-rendered canvas reads back as a single uniform color.
    .toBeGreaterThan(1);
});

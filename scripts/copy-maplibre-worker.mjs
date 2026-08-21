#!/usr/bin/env node
// maplibre-gl resolves its Web Worker script relative to its own
// import.meta.url at runtime, which breaks once a bundler (Turbopack/
// Webpack) moves/hashes the main chunk — the worker ends up requested at a
// path Next.js doesn't serve, and the app falls back to a 404 HTML page
// ("Failed to load module script: ... non-JavaScript MIME type"). Serving
// our own copy from public/ and pointing maplibre-gl at it via
// setWorkerUrl() (see src/components/client/MapModal.tsx) sidesteps this.
//
// public/maplibre-gl-worker.mjs is committed to git (not gitignored) so the
// deployed build always has it regardless of whether a hosting platform's
// install cache re-runs this postinstall script. Re-run this script (or
// `pnpm install`) and commit the result after bumping maplibre-gl.
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const SRC = path.join(
  process.cwd(),
  "node_modules",
  "maplibre-gl",
  "dist",
  "maplibre-gl-worker.mjs",
);
const DEST = path.join(process.cwd(), "public", "maplibre-gl-worker.mjs");

async function main() {
  await mkdir(path.dirname(DEST), { recursive: true });
  await copyFile(SRC, DEST);
  console.log(`Copied maplibre-gl worker to ${path.relative(process.cwd(), DEST)}`);
}

main().catch((error) => {
  console.error("Failed to copy maplibre-gl worker:", error);
  process.exitCode = 1;
});

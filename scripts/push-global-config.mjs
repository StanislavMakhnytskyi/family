#!/usr/bin/env node
// Combines src/data/*.json into the single Global Config item shape this
// app reads (see src/lib/data.ts), and writes a ready-to-use `vercel
// global-config update --patch` payload.
//
// Usage:
//   node scripts/push-global-config.mjs
//   vercel global-config update <store-slug-or-id> --patch "$(cat .vercel-global-config/patch.json)"

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const OUT_DIR = path.join(process.cwd(), ".vercel-global-config");
const OUT_FILE = path.join(OUT_DIR, "patch.json");
const GLOBAL_CONFIG_KEY = "data";

const COLLECTIONS = [
  "people",
  "relationships",
  "graves",
  "media",
  "questions",
];

async function main() {
  const value = {};
  for (const name of COLLECTIONS) {
    const filePath = path.join(DATA_DIR, `${name}.json`);
    value[name] = JSON.parse(await readFile(filePath, "utf-8"));
  }

  const payload = JSON.stringify(value);
  const sizeKb = (Buffer.byteLength(payload) / 1024).toFixed(1);

  const patch = {
    items: [{ operation: "upsert", key: GLOBAL_CONFIG_KEY, value }],
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(patch), "utf-8");

  const relOut = path.relative(process.cwd(), OUT_FILE);
  const posixRelOut = relOut.split(path.sep).join("/");
  console.log(`Wrote ${relOut} (${sizeKb} KB combined value, 1024 KB limit)`);
  console.log("\nPush it with (bash/zsh/Git Bash):\n");
  console.log(
    `  vercel global-config update <store-slug> --patch "$(cat ${posixRelOut})"\n`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

#!/usr/bin/env node
// Combines src/data/*.json into the single Global Config item shape this
// app reads (see src/lib/data.ts), and writes two ready-to-use files:
//   - dashboard-item.json — paste as-is into the Global Config dashboard's
//     "Items" JSON editor (shape: { "data": { people, relationships, ... } })
//   - patch.json — payload for `vercel global-config update --patch`
//
// Usage:
//   node scripts/push-global-config.mjs
//   vercel global-config update <store-slug-or-id> --patch "$(cat .vercel-global-config/patch.json)"

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const OUT_DIR = path.join(process.cwd(), ".vercel-global-config");
const PATCH_FILE = path.join(OUT_DIR, "patch.json");
const DASHBOARD_FILE = path.join(OUT_DIR, "dashboard-item.json");
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
  const dashboardItem = { [GLOBAL_CONFIG_KEY]: value };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(PATCH_FILE, JSON.stringify(patch), "utf-8");
  await writeFile(DASHBOARD_FILE, JSON.stringify(dashboardItem, null, 2), "utf-8");

  const relPatch = path.relative(process.cwd(), PATCH_FILE).split(path.sep).join("/");
  const relDashboard = path.relative(process.cwd(), DASHBOARD_FILE);
  console.log(`Wrote ${relDashboard} (${sizeKb} KB combined value, 1024 KB limit)`);
  console.log(`Wrote ${relPatch}`);
  console.log(
    "\nEasiest: paste dashboard-item.json's contents into the Global Config" +
      " dashboard's Items JSON editor (Storage → your store → Items).",
  );
  console.log("\nOr push via CLI (bash/zsh/Git Bash):\n");
  console.log(
    `  vercel global-config update <store-slug> --patch "$(cat ${relPatch})"\n`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

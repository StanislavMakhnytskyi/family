#!/usr/bin/env node
// Re-encodes avatars that predate the progressive {small, large} scheme
// (src/lib/schemas.ts's avatarSchema still reads these fine -- it just
// serves the original, full-size upload for both the tiny tree-card avatar
// and the person-page hero, which is exactly what Lighthouse's
// image-delivery-insight flags: some of these were 700+ KB PNGs served at
// ~50x50 display size).
//
// For every person whose avatar.small === avatar.large (i.e. never
// re-uploaded through the admin panel since that scheme shipped), this
// downloads the original blob, re-encodes it into a 160px "small" and a
// 480px "large" webp via @vercel/blob's putImage (same as
// uploadAvatarImage() in src/lib/blob.ts), and rewrites the person's avatar
// field to point at the two new blobs. The original oversized blob is left
// in place -- this script never deletes storage; clean it up by hand later
// if you want to reclaim space.
//
// Needs real Vercel Blob credentials (BLOB_READ_WRITE_TOKEN or an OIDC
// token), which this dev environment doesn't have -- run it yourself:
//   node --env-file=.env.local scripts/migrate-legacy-avatars.mjs --source=local
//   node --env-file=.env.local scripts/migrate-legacy-avatars.mjs --source=global-config
//
// --dry-run lists what would change without uploading or writing anything.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { get, putImage } from "@vercel/blob";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const GLOBAL_CONFIG_KEY = "data";

const args = process.argv.slice(2);
const source = args.includes("--source=global-config") ? "global-config" : "local";
const dryRun = args.includes("--dry-run");

async function readLocalPeople() {
  const filePath = path.join(DATA_DIR, "people.json");
  return JSON.parse(await readFile(filePath, "utf-8"));
}

async function writeLocalPeople(people) {
  const filePath = path.join(DATA_DIR, "people.json");
  await writeFile(filePath, JSON.stringify(people, null, 2) + "\n", "utf-8");
}

function globalConfigItemsUrl(storeId) {
  const teamId = process.env.VERCEL_TEAM_ID;
  const url = new URL(`https://api.vercel.com/v1/global-config/${storeId}/items`);
  if (teamId) url.searchParams.set("teamId", teamId);
  return url;
}

async function readGlobalConfigData() {
  const configId = process.env.GLOBAL_CONFIG;
  if (!configId) throw new Error("GLOBAL_CONFIG is not set.");
  const { get: getGlobalConfigItem } = await import("@vercel/global-config");
  const value = await getGlobalConfigItem(GLOBAL_CONFIG_KEY);
  if (!value) throw new Error(`No "${GLOBAL_CONFIG_KEY}" item in Global Config.`);
  return value;
}

async function writeGlobalConfigData(value) {
  const token = process.env.VERCEL_API_TOKEN;
  const storeId = process.env.VERCEL_GLOBAL_CONFIG_STORE_ID;
  if (!token || !storeId) {
    throw new Error("VERCEL_API_TOKEN and VERCEL_GLOBAL_CONFIG_STORE_ID must be set.");
  }
  const response = await fetch(globalConfigItemsUrl(storeId), {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ items: [{ operation: "upsert", key: GLOBAL_CONFIG_KEY, value }] }),
  });
  if (!response.ok) {
    throw new Error(`Global Config update failed (${response.status}): ${await response.text()}`);
  }
}

function pathnameFromMediaUrl(url) {
  const marker = "/api/media/";
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length));
}

async function reencodeAvatar(personId, url) {
  const pathname = pathnameFromMediaUrl(url);
  if (!pathname) {
    console.warn(`  skip: not a private-media URL: ${url}`);
    return null;
  }

  const result = await get(pathname, { access: "private" });
  if (!result || result.statusCode !== 200) {
    console.warn(`  skip: couldn't fetch original blob (${pathname})`);
    return null;
  }
  const chunks = [];
  for await (const chunk of result.stream) chunks.push(chunk);
  const buffer = Buffer.concat(chunks);
  const filename = pathname.split("/").pop() ?? "avatar";

  const [small, large] = await Promise.all([
    putImage(`people/${personId}/small/${filename}`, buffer, {
      access: "private",
      addRandomSuffix: true,
      optimizeImage: { width: 160, quality: 82, format: "webp" },
    }),
    putImage(`people/${personId}/large/${filename}`, buffer, {
      access: "private",
      addRandomSuffix: true,
      optimizeImage: { width: 480, quality: 82, format: "webp" },
    }),
  ]);

  return {
    small: `/api/media/${small.pathname}`,
    large: `/api/media/${large.pathname}`,
  };
}

async function main() {
  const raw = source === "local" ? await readLocalPeople() : await readGlobalConfigData();
  const people = source === "local" ? raw : raw.people;

  const candidates = people.filter((person) => {
    const avatar = person.avatar;
    if (!avatar) return false;
    if (typeof avatar === "string") return true;
    return avatar.small === avatar.large;
  });

  if (candidates.length === 0) {
    console.log("No legacy (un-migrated) avatars found -- nothing to do.");
    return;
  }

  console.log(
    `Found ${candidates.length} legacy avatar(s)${dryRun ? " (dry run, no changes will be made)" : ""}:`,
  );
  for (const person of candidates) {
    const url = typeof person.avatar === "string" ? person.avatar : person.avatar.small;
    console.log(`  - ${person.id}: ${url}`);
  }
  if (dryRun) return;

  let changed = 0;
  for (const person of candidates) {
    const url = typeof person.avatar === "string" ? person.avatar : person.avatar.small;
    console.log(`Re-encoding ${person.id}...`);
    const next = await reencodeAvatar(person.id, url);
    if (next) {
      person.avatar = next;
      changed++;
    }
  }

  if (changed === 0) {
    console.log("Nothing was successfully re-encoded -- no changes written.");
    return;
  }

  if (source === "local") {
    await writeLocalPeople(people);
  } else {
    await writeGlobalConfigData({ ...raw, people });
  }
  console.log(`Done -- re-encoded and saved ${changed} avatar(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

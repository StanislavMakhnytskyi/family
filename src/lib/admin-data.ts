import "server-only";
import { writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { get as getGlobalConfigItem } from "@vercel/global-config";
import {
  peopleSchema,
  relationshipsSchema,
  gravesSchema,
  mediaListSchema,
  questionsSchema,
  type Person,
  type Relationship,
  type Grave,
  type Media,
  type Question,
} from "@/lib/schemas";
import { DATA_DIR, GLOBAL_CONFIG_KEY, readLocalData, type RawData } from "@/lib/data";

export type DataSource = "local" | "global-config";

const DATA_SOURCE_COOKIE = "admin-data-source";

export async function getSelectedDataSource(): Promise<DataSource | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(DATA_SOURCE_COOKIE)?.value;
  return value === "local" || value === "global-config" ? value : null;
}

export async function setSelectedDataSource(source: DataSource): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(DATA_SOURCE_COOKIE, source, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export type FullData = {
  people: Person[];
  relationships: Relationship[];
  graves: Grave[];
  media: Media[];
  questions: Question[];
};

export function isLocalSourceAvailable(): boolean {
  return !process.env.VERCEL;
}

export function isGlobalConfigSourceAvailable(): boolean {
  return Boolean(
    process.env.GLOBAL_CONFIG &&
      process.env.VERCEL_API_TOKEN &&
      process.env.VERCEL_GLOBAL_CONFIG_STORE_ID,
  );
}

function formatZodError(error: { issues: { path: PropertyKey[]; message: string }[] }): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"} — ${issue.message}`)
    .join("; ");
}

export type ValidationResult =
  | { success: true; data: FullData }
  | { success: false; errors: string[] };

/**
 * Validates the combined data object: each collection against its Zod
 * schema, then referential integrity across them (nothing currently
 * enforces this at the schema level). Used before every write, and by the
 * admin's delete-guard checks.
 */
export function validateRawData(value: unknown): ValidationResult {
  if (typeof value !== "object" || value === null) {
    return { success: false, errors: ["Data must be an object."] };
  }
  const raw = value as Partial<RawData>;
  const errors: string[] = [];

  const peopleResult = peopleSchema.safeParse(raw.people);
  if (!peopleResult.success) {
    errors.push(`people: ${formatZodError(peopleResult.error)}`);
  }
  const relationshipsResult = relationshipsSchema.safeParse(raw.relationships);
  if (!relationshipsResult.success) {
    errors.push(`relationships: ${formatZodError(relationshipsResult.error)}`);
  }
  const gravesResult = gravesSchema.safeParse(raw.graves);
  if (!gravesResult.success) {
    errors.push(`graves: ${formatZodError(gravesResult.error)}`);
  }
  const mediaResult = mediaListSchema.safeParse(raw.media);
  if (!mediaResult.success) {
    errors.push(`media: ${formatZodError(mediaResult.error)}`);
  }
  const questionsResult = questionsSchema.safeParse(raw.questions);
  if (!questionsResult.success) {
    errors.push(`questions: ${formatZodError(questionsResult.error)}`);
  }

  if (
    !peopleResult.success ||
    !relationshipsResult.success ||
    !gravesResult.success ||
    !mediaResult.success ||
    !questionsResult.success
  ) {
    return { success: false, errors };
  }

  const people = peopleResult.data;
  const relationships = relationshipsResult.data;
  const graves = gravesResult.data;
  const media = mediaResult.data;
  const questions = questionsResult.data;

  const personIds = new Set(people.map((person) => person.id));
  for (const rel of relationships) {
    if (!personIds.has(rel.person1Id)) {
      errors.push(`relationship "${rel.id}": unknown person "${rel.person1Id}"`);
    }
    if (!personIds.has(rel.person2Id)) {
      errors.push(`relationship "${rel.id}": unknown person "${rel.person2Id}"`);
    }
  }
  for (const grave of graves) {
    if (!personIds.has(grave.personId)) {
      errors.push(`grave for "${grave.personId}": unknown person`);
    }
  }
  for (const item of media) {
    if (!personIds.has(item.personId)) {
      errors.push(`media "${item.id}": unknown person "${item.personId}"`);
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: { people, relationships, graves, media, questions } };
}

/**
 * Renames a person's id everywhere it's referenced — relationships,
 * graves, and media all store a foreign-key-style personId, and nothing
 * enforces that automatically, so a rename has to cascade explicitly.
 */
export function renamePersonId(data: FullData, oldId: string, newId: string): FullData {
  if (oldId === newId) return data;
  return {
    ...data,
    people: data.people.map((person) =>
      person.id === oldId ? { ...person, id: newId } : person,
    ),
    relationships: data.relationships.map((rel) => ({
      ...rel,
      person1Id: rel.person1Id === oldId ? newId : rel.person1Id,
      person2Id: rel.person2Id === oldId ? newId : rel.person2Id,
    })),
    graves: data.graves.map((grave) =>
      grave.personId === oldId ? { ...grave, personId: newId } : grave,
    ),
    media: data.media.map((item) =>
      item.personId === oldId ? { ...item, personId: newId } : item,
    ),
  };
}

/** What references a person, for the delete-guard UI. Empty array = safe to delete. */
export function findPersonReferences(data: FullData, personId: string): string[] {
  const refs: string[] = [];
  const relCount = data.relationships.filter(
    (rel) => rel.person1Id === personId || rel.person2Id === personId,
  ).length;
  if (relCount > 0) refs.push(`${relCount} зв'язок(ки)`);
  const graveCount = data.graves.filter((grave) => grave.personId === personId).length;
  if (graveCount > 0) refs.push(`${graveCount} запис(и) про поховання`);
  const mediaCount = data.media.filter((item) => item.personId === personId).length;
  if (mediaCount > 0) refs.push(`${mediaCount} медіа-файл(и)`);
  return refs;
}

function globalConfigItemsUrl(storeId: string): URL {
  const teamId = process.env.VERCEL_TEAM_ID;
  const url = new URL(`https://api.vercel.com/v1/global-config/${storeId}/items`);
  if (teamId) url.searchParams.set("teamId", teamId);
  return url;
}

/**
 * Reads via the `@vercel/global-config` SDK. An earlier version of this
 * function read through the REST API instead, chasing a few seconds of
 * post-write staleness — but Vercel's docs don't actually publish a
 * response shape for that endpoint's GET (the flat {key: value} example in
 * their docs is for a *different* endpoint, global-config.vercel.com, which
 * needs its own separate read token), and it turned out to return a shape
 * this code didn't parse correctly, breaking every admin read outright.
 * The SDK is what Vercel's own docs recommend for reads; a few seconds of
 * staleness after a save is a far smaller problem than that was.
 */
async function readRemoteData(): Promise<RawData> {
  if (!process.env.GLOBAL_CONFIG) {
    throw new Error(
      "GLOBAL_CONFIG не задано — неможливо прочитати з Vercel Global Config.",
    );
  }
  const remote = await getGlobalConfigItem<RawData>(GLOBAL_CONFIG_KEY);
  if (!remote) {
    throw new Error(`У Global Config немає елемента "${GLOBAL_CONFIG_KEY}".`);
  }
  return remote;
}

export async function readData(source: DataSource): Promise<FullData> {
  const raw = source === "local" ? await readLocalData() : await readRemoteData();
  const result = validateRawData(raw);
  if (!result.success) {
    throw new Error(`Збережені дані не пройшли валідацію: ${result.errors.join("; ")}`);
  }
  return result.data;
}

async function writeLocalData(value: FullData): Promise<void> {
  if (process.env.VERCEL) {
    throw new Error(
      "Редагування локальних файлів недоступне на Vercel — файлова система там доступна лише для читання. Оберіть джерело Vercel Global Config.",
    );
  }
  const entries: [string, unknown][] = [
    ["people.json", value.people],
    ["relationships.json", value.relationships],
    ["graves.json", value.graves],
    ["media.json", value.media],
    ["questions.json", value.questions],
  ];
  await Promise.all(
    entries.map(async ([fileName, data]) => {
      // This branch never runs in production (guarded above), so it's
      // intentionally excluded from Next's build-time file tracing — without
      // this it would otherwise pull all of src/data into the server bundle.
      const target = path.join(/* turbopackIgnore: true */ DATA_DIR, fileName);
      // Write to a temp file then rename over the target: rename is atomic,
      // so a concurrent reader always sees either the old or the new
      // complete file, never a truncated/partial one mid-write.
      const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
      await writeFile(tmp, JSON.stringify(data, null, 2) + "\n", "utf-8");
      await rename(tmp, target);
    }),
  );
}

async function patchGlobalConfigItem(
  operation: "create" | "update" | "upsert",
  value: FullData,
): Promise<Response> {
  const token = process.env.VERCEL_API_TOKEN;
  const storeId = process.env.VERCEL_GLOBAL_CONFIG_STORE_ID as string;

  return fetch(globalConfigItemsUrl(storeId), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [{ operation, key: GLOBAL_CONFIG_KEY, value }],
    }),
  });
}

async function writeGlobalConfigData(value: FullData): Promise<void> {
  const token = process.env.VERCEL_API_TOKEN;
  const storeId = process.env.VERCEL_GLOBAL_CONFIG_STORE_ID;
  if (!token || !storeId) {
    throw new Error(
      "VERCEL_API_TOKEN та VERCEL_GLOBAL_CONFIG_STORE_ID мають бути задані, щоб зберігати в Global Config.",
    );
  }

  let response = await patchGlobalConfigItem("upsert", value);

  // A brand-new store has no "data" item yet. "upsert" is documented to
  // create-or-update, but if the store has never had this key written to
  // it, fall back to an explicit "create" once rather than surfacing a
  // confusing "item not found" error on someone's very first save.
  if (!response.ok && response.status === 404) {
    response = await patchGlobalConfigItem("create", value);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Оновлення Global Config не вдалося (${response.status}): ${text}`);
  }
}

export async function writeData(source: DataSource, value: FullData): Promise<void> {
  const validated = validateRawData(value);
  if (!validated.success) {
    throw new Error(`Дані не збережено, вони некоректні: ${validated.errors.join("; ")}`);
  }
  if (source === "local") {
    await writeLocalData(validated.data);
  } else {
    await writeGlobalConfigData(validated.data);
  }
}

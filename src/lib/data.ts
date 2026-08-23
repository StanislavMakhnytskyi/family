import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
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

export const DATA_DIR = path.join(process.cwd(), "src", "data");
export const GLOBAL_CONFIG_KEY = "data";

export type RawData = {
  people: unknown;
  relationships: unknown;
  graves: unknown;
  media: unknown;
  questions: unknown;
};

async function readLocalJson(fileName: string): Promise<unknown> {
  const filePath = path.join(DATA_DIR, fileName);
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

export async function readLocalData(): Promise<RawData> {
  const [people, relationships, graves, media, questions] = await Promise.all([
    readLocalJson("people.json"),
    readLocalJson("relationships.json"),
    readLocalJson("graves.json"),
    readLocalJson("media.json"),
    readLocalJson("questions.json"),
  ]);
  return { people, relationships, graves, media, questions };
}

// Reads the combined { people, relationships, graves, media, questions }
// object from Vercel Global Config when GLOBAL_CONFIG is configured (both in
// production and in local dev after `vercel env pull`), falling back to the
// local src/data/*.json files otherwise — keeps them usable offline and as
// seed data. See scripts/push-global-config.mjs to push local edits up.
const loadRawData = cache(async (): Promise<RawData> => {
  if (process.env.GLOBAL_CONFIG) {
    try {
      const remote = await getGlobalConfigItem<RawData>(GLOBAL_CONFIG_KEY);
      if (remote) return remote;
    } catch (error) {
      console.warn(
        "Failed to read Global Config, falling back to local JSON data:",
        error,
      );
    }
  }
  return readLocalData();
});

export const getPeople = cache(async (): Promise<Person[]> => {
  return peopleSchema.parse((await loadRawData()).people);
});

export const getRelationships = cache(async (): Promise<Relationship[]> => {
  return relationshipsSchema.parse((await loadRawData()).relationships);
});

export const getGraves = cache(async (): Promise<Grave[]> => {
  return gravesSchema.parse((await loadRawData()).graves);
});

export const getMedia = cache(async (): Promise<Media[]> => {
  return mediaListSchema.parse((await loadRawData()).media);
});

export const getQuestions = cache(async (): Promise<Question[]> => {
  return questionsSchema.parse((await loadRawData()).questions);
});

export async function getPersonById(id: string): Promise<Person | null> {
  const people = await getPeople();
  return people.find((person) => person.id === id) ?? null;
}

export async function getGraveByPersonId(id: string): Promise<Grave | null> {
  const graves = await getGraves();
  return graves.find((grave) => grave.personId === id) ?? null;
}

export async function getMediaByPersonId(id: string): Promise<Media[]> {
  const media = await getMedia();
  return media.filter((item) => item.personIds.includes(id));
}

export type Relatives = {
  parents: Person[];
  spouses: Person[];
  children: Person[];
};

export async function getRelatives(personId: string): Promise<Relatives> {
  const [people, relationships] = await Promise.all([
    getPeople(),
    getRelationships(),
  ]);
  const byId = new Map(people.map((person) => [person.id, person]));

  const parentIds = relationships
    .filter((rel) => rel.type === "parent-child" && rel.person2Id === personId)
    .map((rel) => rel.person1Id);

  const childIds = relationships
    .filter((rel) => rel.type === "parent-child" && rel.person1Id === personId)
    .map((rel) => rel.person2Id);

  const spouseIds = relationships
    .filter((rel) => rel.type === "spouse" && (rel.person1Id === personId || rel.person2Id === personId))
    .map((rel) => (rel.person1Id === personId ? rel.person2Id : rel.person1Id));

  const resolve = (ids: string[]) =>
    ids
      .map((id) => byId.get(id))
      .filter((person): person is Person => person !== undefined);

  return {
    parents: resolve(parentIds),
    spouses: resolve(spouseIds),
    children: resolve(childIds),
  };
}

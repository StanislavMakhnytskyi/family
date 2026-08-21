import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
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

const DATA_DIR = path.join(process.cwd(), "src", "data");

async function readJson(fileName: string): Promise<unknown> {
  const filePath = path.join(DATA_DIR, fileName);
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

export const getPeople = cache(async (): Promise<Person[]> => {
  return peopleSchema.parse(await readJson("people.json"));
});

export const getRelationships = cache(async (): Promise<Relationship[]> => {
  return relationshipsSchema.parse(await readJson("relationships.json"));
});

export const getGraves = cache(async (): Promise<Grave[]> => {
  return gravesSchema.parse(await readJson("graves.json"));
});

export const getMedia = cache(async (): Promise<Media[]> => {
  return mediaListSchema.parse(await readJson("media.json"));
});

export const getQuestions = cache(async (): Promise<Question[]> => {
  return questionsSchema.parse(await readJson("questions.json"));
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
  return media.filter((item) => item.personId === id);
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

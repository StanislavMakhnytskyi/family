"use server";

import { redirect } from "next/navigation";
import { getSelectedDataSource, readData, writeData } from "@/lib/admin-data";

export type RelationshipFormState = { error?: string };

function generateId(): string {
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function saveRelationship(
  _prevState: RelationshipFormState,
  formData: FormData,
): Promise<RelationshipFormState> {
  const source = await getSelectedDataSource();
  if (!source) redirect("/admin");

  const isNew = formData.get("mode") === "new";
  const id = isNew ? generateId() : String(formData.get("id") ?? "");
  const type = String(formData.get("type") ?? "");
  const person1Id = String(formData.get("person1Id") ?? "");
  const person2Id = String(formData.get("person2Id") ?? "");

  if (type !== "parent-child" && type !== "spouse" && type !== "sibling") {
    return { error: "Оберіть тип зв'язку." };
  }
  if (!person1Id || !person2Id) {
    return { error: "Оберіть обидві людини." };
  }
  if (person1Id === person2Id) {
    return { error: "Людина не може мати зв'язок сама з собою." };
  }

  let data;
  try {
    data = await readData(source);
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
  const relationship = { id, type, person1Id, person2Id } as const;

  const nextRelationships = isNew
    ? [...data.relationships, relationship]
    : data.relationships.map((rel) => (rel.id === id ? relationship : rel));

  try {
    await writeData(source, { ...data, relationships: nextRelationships });
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }

  redirect("/admin/relationships");
}

export async function deleteRelationship(formData: FormData): Promise<void> {
  const source = await getSelectedDataSource();
  if (!source) redirect("/admin");

  const id = String(formData.get("id") ?? "");
  const data = await readData(source);
  await writeData(source, {
    ...data,
    relationships: data.relationships.filter((rel) => rel.id !== id),
  });
  redirect("/admin/relationships");
}

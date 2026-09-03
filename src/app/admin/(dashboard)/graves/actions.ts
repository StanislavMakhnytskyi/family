"use server";

import { redirect } from "next/navigation";
import { getSelectedDataSource, readData, writeData } from "@/lib/admin-data";

export type GraveFormState = { error?: string };

export async function saveGrave(
  _prevState: GraveFormState,
  formData: FormData,
): Promise<GraveFormState> {
  const source = await getSelectedDataSource();
  if (!source) redirect("/admin");

  const isNew = formData.get("mode") === "new";
  const personId = String(formData.get("personId") ?? "");
  const latitude = Number(formData.get("latitude"));
  const longitude = Number(formData.get("longitude"));
  const address = String(formData.get("address") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!personId) {
    return { error: "Оберіть людину." };
  }
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return { error: "Широта має бути числом від -90 до 90." };
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return { error: "Довгота має бути числом від -180 до 180." };
  }

  let data;
  try {
    data = await readData(source);
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
  const exists = data.graves.some((grave) => grave.personId === personId);
  if (isNew && exists) {
    return { error: "У цієї людини вже є запис про поховання — відредагуйте його." };
  }

  const grave = {
    personId,
    latitude,
    longitude,
    address: address || undefined,
    description: description || undefined,
  };

  const nextGraves = isNew
    ? [...data.graves, grave]
    : data.graves.map((existing) =>
        existing.personId === personId ? grave : existing,
      );

  try {
    await writeData(source, { ...data, graves: nextGraves });
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }

  redirect("/admin/graves");
}

export async function deleteGrave(formData: FormData): Promise<void> {
  const source = await getSelectedDataSource();
  if (!source) redirect("/admin");

  const personId = String(formData.get("personId") ?? "");
  const data = await readData(source);
  await writeData(source, {
    ...data,
    graves: data.graves.filter((grave) => grave.personId !== personId),
  });
  redirect("/admin/graves");
}

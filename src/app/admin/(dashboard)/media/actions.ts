"use server";

import { redirect } from "next/navigation";
import { getSelectedDataSource, readData, writeData } from "@/lib/admin-data";
import { uploadPrivateFile } from "@/lib/blob";

export type MediaFormState = { error?: string };

function generateId(): string {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function saveMedia(
  _prevState: MediaFormState,
  formData: FormData,
): Promise<MediaFormState> {
  const source = await getSelectedDataSource();
  if (!source) redirect("/admin");

  const isNew = formData.get("mode") === "new";
  const id = isNew ? generateId() : String(formData.get("id") ?? "");
  const personIds = formData.getAll("personIds").map(String).filter(Boolean);
  const type = String(formData.get("type") ?? "");
  const caption = String(formData.get("caption") ?? "").trim();
  const yearRaw = String(formData.get("year") ?? "").trim();
  const file = formData.get("file");

  if (personIds.length === 0) {
    return { error: "Оберіть хоча б одну людину." };
  }
  if (type !== "photo" && type !== "document") {
    return { error: "Оберіть тип файлу." };
  }

  const data = await readData(source);
  const existing = data.media.find((item) => item.id === id);

  if (isNew && !(file instanceof File && file.size > 0)) {
    return { error: "Оберіть файл для завантаження." };
  }

  let url = existing?.url;
  if (file instanceof File && file.size > 0) {
    try {
      const uploaded = await uploadPrivateFile(`media/${personIds[0]}`, file);
      url = uploaded.url;
    } catch (error) {
      return {
        error: `Не вдалося завантажити файл: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
  if (!url) {
    return { error: "Не вдалося визначити файл." };
  }

  const year = yearRaw ? Number(yearRaw) : undefined;
  if (year !== undefined && !Number.isInteger(year)) {
    return { error: "Рік має бути цілим числом." };
  }

  const media = {
    id,
    personIds,
    url,
    type: type as "photo" | "document",
    caption: caption || undefined,
    year,
  };

  const nextMedia = isNew
    ? [...data.media, media]
    : data.media.map((item) => (item.id === id ? media : item));

  try {
    await writeData(source, { ...data, media: nextMedia });
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }

  redirect("/admin/media");
}

export async function deleteMedia(formData: FormData): Promise<void> {
  const source = await getSelectedDataSource();
  if (!source) redirect("/admin");

  const id = String(formData.get("id") ?? "");
  const data = await readData(source);
  await writeData(source, {
    ...data,
    media: data.media.filter((item) => item.id !== id),
  });
  redirect("/admin/media");
}

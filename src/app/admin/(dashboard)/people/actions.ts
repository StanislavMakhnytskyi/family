"use server";

import { redirect } from "next/navigation";
import {
  getSelectedDataSource,
  readData,
  writeData,
  findPersonReferences,
  renamePersonId,
} from "@/lib/admin-data";
import { uploadAvatarImage } from "@/lib/blob";
import type { Avatar } from "@/lib/schemas";
import { textareaValueToBio } from "@/lib/admin-forms";

export type PersonFormState = { error?: string };

export async function savePerson(
  _prevState: PersonFormState,
  formData: FormData,
): Promise<PersonFormState> {
  const source = await getSelectedDataSource();
  if (!source) redirect("/admin");

  const isNew = formData.get("mode") === "new";
  const originalId = String(formData.get("originalId") ?? "").trim();
  const id = String(formData.get("id") ?? "").trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const middleName = String(formData.get("middleName") ?? "").trim();
  const birthDate = String(formData.get("birthDate") ?? "").trim();
  const deathDate = String(formData.get("deathDate") ?? "").trim();
  const bioValue = String(formData.get("bio") ?? "");
  const removeAvatar = formData.get("removeAvatar") === "on";
  const avatarFile = formData.get("avatarFile");

  if (!id || !firstName) {
    return {
      error: "Заповніть обов'язкові поля: id, ім'я.",
    };
  }

  const data = await readData(source);

  if (isNew) {
    if (data.people.some((person) => person.id === id)) {
      return { error: `Людина з id "${id}" вже існує.` };
    }
  } else {
    if (!data.people.some((person) => person.id === originalId)) {
      return { error: `Людину з id "${originalId}" не знайдено.` };
    }
    if (id !== originalId && data.people.some((person) => person.id === id)) {
      return { error: `Людина з id "${id}" вже існує.` };
    }
  }

  let avatar: Avatar | undefined = isNew
    ? undefined
    : data.people.find((person) => person.id === originalId)?.avatar;
  if (removeAvatar) {
    avatar = undefined;
  } else if (avatarFile instanceof File && avatarFile.size > 0) {
    try {
      const uploaded = await uploadAvatarImage(`people/${id}`, avatarFile);
      avatar = { small: uploaded.small.url, large: uploaded.large.url };
    } catch (error) {
      return {
        error: `Не вдалося завантажити фото: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  const person = {
    id,
    firstName,
    lastName: lastName || undefined,
    middleName: middleName || undefined,
    birthDate: birthDate || undefined,
    deathDate: deathDate || undefined,
    bio: textareaValueToBio(bioValue),
    avatar,
  };

  const nextPeople = isNew
    ? [...data.people, person]
    : data.people.map((existing) => (existing.id === originalId ? person : existing));

  let nextData = { ...data, people: nextPeople };
  if (!isNew && id !== originalId) {
    nextData = renamePersonId(nextData, originalId, id);
  }

  try {
    await writeData(source, nextData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }

  redirect("/admin/people");
}

export async function deletePerson(formData: FormData): Promise<void> {
  const source = await getSelectedDataSource();
  if (!source) redirect("/admin");

  const id = String(formData.get("id") ?? "");
  const data = await readData(source);
  const refs = findPersonReferences(data, id);
  if (refs.length > 0) {
    redirect(
      `/admin/people?error=${encodeURIComponent(
        `Не можна видалити: на цю людину посилаються ${refs.join(", ")}.`,
      )}`,
    );
  }

  await writeData(source, {
    ...data,
    people: data.people.filter((person) => person.id !== id),
  });
  redirect("/admin/people");
}

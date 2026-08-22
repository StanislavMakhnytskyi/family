"use server";

import { redirect } from "next/navigation";
import {
  getSelectedDataSource,
  readData,
  writeData,
  findPersonReferences,
} from "@/lib/admin-data";
import { uploadPrivateFile } from "@/lib/blob";
import { textareaValueToBio } from "@/lib/admin-forms";

export type PersonFormState = { error?: string };

export async function savePerson(
  _prevState: PersonFormState,
  formData: FormData,
): Promise<PersonFormState> {
  const source = await getSelectedDataSource();
  if (!source) redirect("/admin");

  const isNew = formData.get("mode") === "new";
  const id = String(formData.get("id") ?? "").trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const birthDate = String(formData.get("birthDate") ?? "").trim();
  const deathDate = String(formData.get("deathDate") ?? "").trim();
  const bioValue = String(formData.get("bio") ?? "");
  const removeAvatar = formData.get("removeAvatar") === "on";
  const avatarFile = formData.get("avatarFile");

  if (!id || !firstName || !lastName || !birthDate) {
    return {
      error: "Заповніть обов'язкові поля: id, ім'я, прізвище, дата народження.",
    };
  }

  const data = await readData(source);
  const exists = data.people.some((person) => person.id === id);

  if (isNew && exists) {
    return { error: `Людина з id "${id}" вже існує.` };
  }
  if (!isNew && !exists) {
    return { error: `Людину з id "${id}" не знайдено.` };
  }

  let avatar = data.people.find((person) => person.id === id)?.avatar;
  if (removeAvatar) {
    avatar = undefined;
  } else if (avatarFile instanceof File && avatarFile.size > 0) {
    try {
      const uploaded = await uploadPrivateFile(`people/${id}`, avatarFile);
      avatar = uploaded.url;
    } catch (error) {
      return {
        error: `Не вдалося завантажити фото: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  const person = {
    id,
    firstName,
    lastName,
    birthDate,
    deathDate: deathDate || undefined,
    bio: textareaValueToBio(bioValue),
    avatar,
  };

  const nextPeople = isNew
    ? [...data.people, person]
    : data.people.map((existing) => (existing.id === id ? person : existing));

  try {
    await writeData(source, { ...data, people: nextPeople });
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

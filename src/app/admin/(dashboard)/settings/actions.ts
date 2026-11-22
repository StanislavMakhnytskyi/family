"use server";

import { redirect } from "next/navigation";

import { setAdminFlash } from "@/lib/admin-flash";
import { getSelectedDataSource, readData, writeData } from "@/lib/admin-data";

export type SettingsFormState = { error?: string };

export async function saveSettings(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const source = await getSelectedDataSource();
  if (!source) redirect("/admin");

  let data;
  try {
    data = await readData(source);
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }

  try {
    await writeData(source, {
      ...data,
      settings: {
        ...data.settings,
        showFullDates: formData.get("showFullDates") === "on",
      },
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }

  await setAdminFlash("saved");
  redirect("/admin/settings");
}

"use server";

import { redirect } from "next/navigation";
import { setSelectedDataSource } from "@/lib/admin-data";

export async function setDataSource(formData: FormData): Promise<void> {
  const source = formData.get("source");
  if (source !== "local" && source !== "global-config") {
    throw new Error("Invalid data source");
  }
  await setSelectedDataSource(source);
  redirect("/admin/people");
}

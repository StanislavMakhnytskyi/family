import { redirect } from "next/navigation";

import { MediaForm } from "../MediaForm";
import { getSelectedDataSource, readData } from "@/lib/admin-data";

export default async function NewMediaPage() {
  const source = await getSelectedDataSource();
  if (!source) redirect("/admin");
  const data = await readData(source);

  return (
    <div>
      <h1 className="mb-5 font-serif text-2xl text-ink">Новий медіа-файл</h1>
      <MediaForm people={data.people} />
    </div>
  );
}

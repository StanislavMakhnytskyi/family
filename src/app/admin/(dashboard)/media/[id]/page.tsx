import { notFound, redirect } from "next/navigation";

import { MediaForm } from "../MediaForm";
import { getSelectedDataSource, readData } from "@/lib/admin-data";

export default async function EditMediaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const source = await getSelectedDataSource();
  if (!source) redirect("/admin");

  const data = await readData(source);
  const media = data.media.find((item) => item.id === id);
  if (!media) notFound();

  return (
    <div>
      <h1 className="mb-5 font-serif text-2xl text-ink">Редагувати медіа-файл</h1>
      <MediaForm people={data.people} media={media} />
    </div>
  );
}

import { notFound, redirect } from "next/navigation";

import { GraveForm } from "../GraveForm";
import { getSelectedDataSource, readData } from "@/lib/admin-data";

export default async function EditGravePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const source = await getSelectedDataSource();
  if (!source) redirect("/admin");

  const data = await readData(source);
  const grave = data.graves.find((item) => item.personId === id);
  if (!grave) notFound();

  return (
    <div>
      <h1 className="mb-5 font-serif text-2xl text-ink">Редагувати запис про поховання</h1>
      <GraveForm people={data.people} grave={grave} />
    </div>
  );
}

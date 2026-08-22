import { notFound, redirect } from "next/navigation";

import { RelationshipForm } from "../RelationshipForm";
import { getSelectedDataSource, readData } from "@/lib/admin-data";

export default async function EditRelationshipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const source = await getSelectedDataSource();
  if (!source) redirect("/admin");

  const data = await readData(source);
  const relationship = data.relationships.find((item) => item.id === id);
  if (!relationship) notFound();

  return (
    <div>
      <h1 className="mb-5 font-serif text-2xl text-ink">Редагувати зв&apos;язок</h1>
      <RelationshipForm people={data.people} relationship={relationship} />
    </div>
  );
}

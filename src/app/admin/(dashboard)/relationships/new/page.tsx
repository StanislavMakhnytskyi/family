import { redirect } from "next/navigation";

import { RelationshipForm } from "../RelationshipForm";
import { getSelectedDataSource, readData } from "@/lib/admin-data";

export default async function NewRelationshipPage() {
  const source = await getSelectedDataSource();
  if (!source) redirect("/admin");
  const data = await readData(source);

  return (
    <div>
      <h1 className="mb-5 font-serif text-2xl text-ink">Новий зв&apos;язок</h1>
      <RelationshipForm people={data.people} />
    </div>
  );
}

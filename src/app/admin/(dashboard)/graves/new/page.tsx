import { redirect } from "next/navigation";

import { GraveForm } from "../GraveForm";
import { getSelectedDataSource, readData } from "@/lib/admin-data";

export default async function NewGravePage() {
  const source = await getSelectedDataSource();
  if (!source) redirect("/admin");
  const data = await readData(source);

  return (
    <div>
      <h1 className="mb-5 font-serif text-2xl text-ink">Новий запис про поховання</h1>
      <GraveForm people={data.people} />
    </div>
  );
}

import { notFound, redirect } from "next/navigation";

import { PersonForm } from "../PersonForm";
import { getSelectedDataSource, readData } from "@/lib/admin-data";

export default async function EditPersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const source = await getSelectedDataSource();
  if (!source) redirect("/admin");

  const data = await readData(source);
  const person = data.people.find((item) => item.id === id);
  if (!person) notFound();

  return (
    <div>
      <h1 className="mb-5 font-serif text-2xl text-ink">
        Редагувати: {person.firstName} {person.lastName}
      </h1>
      <PersonForm person={person} />
    </div>
  );
}

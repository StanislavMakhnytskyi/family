import { redirect } from "next/navigation";

import { PersonForm } from "../PersonForm";
import { getSelectedDataSource } from "@/lib/admin-data";

export default async function NewPersonPage() {
  const source = await getSelectedDataSource();
  if (!source) redirect("/admin");

  return (
    <div>
      <h1 className="mb-5 font-serif text-2xl text-ink">Нова людина</h1>
      <PersonForm />
    </div>
  );
}

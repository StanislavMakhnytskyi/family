import Link from "next/link";
import { redirect } from "next/navigation";

import { deleteRelationship } from "./actions";
import { Button } from "@/components/ui/button";
import { getSelectedDataSource, readData } from "@/lib/admin-data";

const TYPE_LABEL: Record<string, string> = {
  "parent-child": "Батько/матір → дитина",
  spouse: "Подружжя",
};

export default async function AdminRelationshipsPage() {
  const source = await getSelectedDataSource();
  if (!source) redirect("/admin");
  const data = await readData(source);
  const byId = new Map(data.people.map((person) => [person.id, person]));
  const name = (id: string) => {
    const person = byId.get(id);
    return person ? `${person.firstName} ${person.lastName}` : id;
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-serif text-2xl text-ink">Зв&apos;язки</h1>
        <Button asChild>
          <Link href="/admin/relationships/new">+ Додати</Link>
        </Button>
      </div>

      <table className="w-full border-collapse text-left text-[14px]">
        <thead>
          <tr className="border-b border-border text-muted">
            <th className="py-2 font-semibold">Тип</th>
            <th className="py-2 font-semibold">Особа 1</th>
            <th className="py-2 font-semibold">Особа 2</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {data.relationships.map((rel) => (
            <tr key={rel.id} className="border-b border-border">
              <td className="py-2.5 text-ink">{TYPE_LABEL[rel.type]}</td>
              <td className="py-2.5 text-muted">{name(rel.person1Id)}</td>
              <td className="py-2.5 text-muted">{name(rel.person2Id)}</td>
              <td className="py-2.5 text-right whitespace-nowrap">
                <Link
                  href={`/admin/relationships/${rel.id}`}
                  className="mr-3 text-terracotta underline"
                >
                  Редагувати
                </Link>
                <form action={deleteRelationship} className="inline">
                  <input type="hidden" name="id" value={rel.id} />
                  <button type="submit" className="text-error underline">
                    Видалити
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

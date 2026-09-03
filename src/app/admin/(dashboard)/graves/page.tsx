import Link from "next/link";
import { redirect } from "next/navigation";

import { deleteGrave } from "./actions";
import { Button } from "@/components/ui/button";
import { DataErrorCard } from "@/components/admin/DataErrorCard";
import { getSelectedDataSource, readDataSafe } from "@/lib/admin-data";

export default async function AdminGravesPage() {
  const source = await getSelectedDataSource();
  if (!source) redirect("/admin");
  const result = await readDataSafe(source);
  if (!result.success) {
    return <DataErrorCard message={result.error} retryHref="/admin/graves" />;
  }
  const data = result.data;
  const byId = new Map(data.people.map((person) => [person.id, person]));
  const name = (id: string) => {
    const person = byId.get(id);
    return person ? `${person.firstName} ${person.lastName}` : id;
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-serif text-2xl text-ink">Поховання</h1>
        <Button asChild>
          <Link href="/admin/graves/new">+ Додати</Link>
        </Button>
      </div>

      <table className="w-full border-collapse text-left text-[14px]">
        <thead>
          <tr className="border-b border-border text-muted">
            <th className="py-2 font-semibold">Людина</th>
            <th className="py-2 font-semibold">Адреса</th>
            <th className="py-2 font-semibold">Координати</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {data.graves.map((grave) => (
            <tr key={grave.personId} className="border-b border-border">
              <td className="py-2.5 text-ink">{name(grave.personId)}</td>
              <td className="py-2.5 text-muted">{grave.address ?? "—"}</td>
              <td className="py-2.5 tabular-nums text-muted">
                {grave.latitude.toFixed(4)}, {grave.longitude.toFixed(4)}
              </td>
              <td className="py-2.5 text-right whitespace-nowrap">
                <Link
                  href={`/admin/graves/${grave.personId}`}
                  className="mr-3 text-terracotta underline"
                >
                  Редагувати
                </Link>
                <form action={deleteGrave} className="inline">
                  <input type="hidden" name="personId" value={grave.personId} />
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

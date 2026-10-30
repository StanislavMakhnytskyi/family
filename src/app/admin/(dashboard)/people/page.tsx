import Link from "next/link";
import { redirect } from "next/navigation";

import { deletePerson } from "./actions";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { DataErrorCard } from "@/components/admin/DataErrorCard";
import { getSelectedDataSource, readDataSafe } from "@/lib/admin-data";
import { lifespan } from "@/lib/utils";

export default async function AdminPeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const source = await getSelectedDataSource();
  if (!source) redirect("/admin");
  const result = await readDataSafe(source);
  if (!result.success) {
    return <DataErrorCard message={result.error} retryHref="/admin/people" />;
  }
  const data = result.data;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-serif text-2xl text-ink">Люди</h1>
        <Button asChild>
          <Link href="/admin/people/new">+ Додати</Link>
        </Button>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-sm border border-error/30 bg-error/5 px-3 py-2 text-caption text-error">
          {error}
        </p>
      )}

      <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-small">
        <thead>
          <tr className="border-b border-border text-muted">
            <th className="py-2 font-semibold">Ім&apos;я</th>
            <th className="py-2 font-semibold">Роки</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {data.people.map((person) => (
            <tr key={person.id} className="border-b border-border">
              <td className="py-2.5 text-ink">
                {person.firstName} {person.lastName}
                {person.hidden && (
                  <span className="ml-2 rounded-xs bg-surface-muted px-1.5 py-0.5 text-caption font-semibold text-faint">
                    приховано з дерева
                  </span>
                )}
              </td>
              <td className="py-2.5 tabular-nums text-muted">
                {lifespan(person.birthDate, person.deathDate, {
                  born: "нар.",
                  died: "пом.",
                })}
              </td>
              <td className="py-2.5 text-right whitespace-nowrap">
                <Link
                  href={`/admin/people/${person.id}`}
                  className="mr-1 inline-block px-2 py-2.5 text-terracotta underline"
                >
                  Редагувати
                </Link>
                <form action={deletePerson} className="inline">
                  <input type="hidden" name="id" value={person.id} />
                  <ConfirmDelete />
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {data.people.length === 0 && (
        <p className="mt-6 text-center text-muted">Поки що тут порожньо.</p>
      )}
    </div>
  );
}

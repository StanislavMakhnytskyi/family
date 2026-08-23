import Link from "next/link";
import { redirect } from "next/navigation";

import { deleteMedia } from "./actions";
import { Button } from "@/components/ui/button";
import { getSelectedDataSource, readData } from "@/lib/admin-data";

const TYPE_LABEL: Record<string, string> = { photo: "Фото", document: "Документ" };

export default async function AdminMediaPage() {
  const source = await getSelectedDataSource();
  if (!source) redirect("/admin");
  const data = await readData(source);
  const byId = new Map(data.people.map((person) => [person.id, person]));
  const names = (ids: string[]) =>
    ids
      .map((id) => {
        const person = byId.get(id);
        return person ? `${person.firstName} ${person.lastName}` : id;
      })
      .join(", ");

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-serif text-2xl text-ink">Медіа</h1>
        <Button asChild>
          <Link href="/admin/media/new">+ Додати</Link>
        </Button>
      </div>

      <table className="w-full border-collapse text-left text-[14px]">
        <thead>
          <tr className="border-b border-border text-muted">
            <th className="py-2 font-semibold">Людина</th>
            <th className="py-2 font-semibold">Тип</th>
            <th className="py-2 font-semibold">Підпис</th>
            <th className="py-2 font-semibold">Рік</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {data.media.map((item) => (
            <tr key={item.id} className="border-b border-border">
              <td className="py-2.5 text-ink">{names(item.personIds)}</td>
              <td className="py-2.5 text-muted">{TYPE_LABEL[item.type]}</td>
              <td className="py-2.5 text-muted">{item.caption ?? "—"}</td>
              <td className="py-2.5 tabular-nums text-muted">{item.year ?? "—"}</td>
              <td className="py-2.5 text-right whitespace-nowrap">
                <Link
                  href={`/admin/media/${item.id}`}
                  className="mr-3 text-terracotta underline"
                >
                  Редагувати
                </Link>
                <form action={deleteMedia} className="inline">
                  <input type="hidden" name="id" value={item.id} />
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

import Link from "next/link";
import { redirect } from "next/navigation";

import { deleteQuestion } from "./actions";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { DataErrorCard } from "@/components/admin/DataErrorCard";
import { getSelectedDataSource, readDataSafe } from "@/lib/admin-data";

export default async function AdminQuestionsPage() {
  const source = await getSelectedDataSource();
  if (!source) redirect("/admin");
  const result = await readDataSafe(source);
  if (!result.success) {
    return <DataErrorCard message={result.error} retryHref="/admin/questions" />;
  }
  const data = result.data;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-serif text-2xl text-ink">Питання для входу</h1>
        <Button asChild>
          <Link href="/admin/questions/new">+ Додати</Link>
        </Button>
      </div>

      <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-small">
        <thead>
          <tr className="border-b border-border text-muted">
            <th className="py-2 font-semibold">Питання</th>
            <th className="py-2 font-semibold">Відповідь</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {data.questions.map((item) => (
            <tr key={item.id} className="border-b border-border">
              <td className="py-2.5 text-ink">{item.question}</td>
              <td className="py-2.5 text-muted">{item.normalizedAnswer}</td>
              <td className="py-2.5 text-right whitespace-nowrap">
                <Link
                  href={`/admin/questions/${item.id}`}
                  className="mr-1 inline-block px-2 py-2.5 text-terracotta underline"
                >
                  Редагувати
                </Link>
                <form action={deleteQuestion} className="inline">
                  <input type="hidden" name="id" value={item.id} />
                  <ConfirmDelete />
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {data.questions.length === 0 && (
        <p className="mt-6 text-center text-muted">Поки що тут порожньо.</p>
      )}
    </div>
  );
}

import { notFound, redirect } from "next/navigation";

import { QuestionForm } from "../QuestionForm";
import { getSelectedDataSource, readData } from "@/lib/admin-data";

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const source = await getSelectedDataSource();
  if (!source) redirect("/admin");

  const data = await readData(source);
  const question = data.questions.find((item) => item.id === id);
  if (!question) notFound();

  return (
    <div>
      <h1 className="mb-5 font-serif text-2xl text-ink">Редагувати питання</h1>
      <QuestionForm question={question} />
    </div>
  );
}

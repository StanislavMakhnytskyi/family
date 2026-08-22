import { redirect } from "next/navigation";

import { QuestionForm } from "../QuestionForm";
import { getSelectedDataSource } from "@/lib/admin-data";

export default async function NewQuestionPage() {
  const source = await getSelectedDataSource();
  if (!source) redirect("/admin");

  return (
    <div>
      <h1 className="mb-5 font-serif text-2xl text-ink">Нове питання</h1>
      <QuestionForm />
    </div>
  );
}

"use server";

import { redirect } from "next/navigation";
import { getSelectedDataSource, readData, writeData } from "@/lib/admin-data";
import { textValueToVariants } from "@/lib/admin-forms";
import { normalizeAnswer } from "@/lib/utils";

export type QuestionFormState = { error?: string };

function generateId(): string {
  return `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function saveQuestion(
  _prevState: QuestionFormState,
  formData: FormData,
): Promise<QuestionFormState> {
  const source = await getSelectedDataSource();
  if (!source) redirect("/admin");

  const isNew = formData.get("mode") === "new";
  const id = isNew ? generateId() : String(formData.get("id") ?? "");
  const question = String(formData.get("question") ?? "").trim();
  const answer = String(formData.get("normalizedAnswer") ?? "").trim();
  const variantsValue = String(formData.get("variants") ?? "");

  if (!question || !answer) {
    return { error: "Заповніть питання та відповідь." };
  }

  let data;
  try {
    data = await readData(source);
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
  const record = {
    id,
    question,
    normalizedAnswer: normalizeAnswer(answer),
    variants: textValueToVariants(variantsValue)?.map(normalizeAnswer),
  };

  const nextQuestions = isNew
    ? [...data.questions, record]
    : data.questions.map((item) => (item.id === id ? record : item));

  try {
    await writeData(source, { ...data, questions: nextQuestions });
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }

  redirect("/admin/questions");
}

export async function deleteQuestion(formData: FormData): Promise<void> {
  const source = await getSelectedDataSource();
  if (!source) redirect("/admin");

  const id = String(formData.get("id") ?? "");
  const data = await readData(source);
  await writeData(source, {
    ...data,
    questions: data.questions.filter((item) => item.id !== id),
  });
  redirect("/admin/questions");
}

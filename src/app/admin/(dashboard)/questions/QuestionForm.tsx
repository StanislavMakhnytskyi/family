"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import { saveQuestion, type QuestionFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { variantsToTextValue } from "@/lib/admin-forms";
import type { Question } from "@/lib/schemas";

const initialState: QuestionFormState = {};

export function QuestionForm({ question }: { question?: Question }) {
  const [state, formAction, isPending] = useActionState(
    saveQuestion,
    initialState,
  );
  const isNew = !question;

  return (
    <form action={formAction} className="flex max-w-[480px] flex-col gap-4">
      <input type="hidden" name="mode" value={isNew ? "new" : "edit"} />
      {!isNew && <input type="hidden" name="id" value={question.id} />}

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted-4">Питання</span>
        <Input name="question" defaultValue={question?.question} required />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted-4">Відповідь</span>
        <Input
          name="normalizedAnswer"
          defaultValue={question?.normalizedAnswer}
          required
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted-4">
          Варіанти відповіді (через кому)
        </span>
        <Input
          name="variants"
          defaultValue={variantsToTextValue(question?.variants)}
          placeholder="варіант 1, варіант 2"
        />
      </label>

      {state.error && (
        <p className="rounded-sm border border-error/30 bg-error/5 px-3 py-2 text-[13.5px] text-error">
          {state.error}
        </p>
      )}

      <div className="flex gap-2.5">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Зберегти
        </Button>
      </div>
    </form>
  );
}

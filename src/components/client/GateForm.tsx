"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { verifyAnswer, type GateState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pickRandomItem } from "@/lib/utils";

type QuestionOption = { id: string; question: string };

type Messages = {
  answerPlaceholder: string;
  submit: string;
  submitting: string;
  otherQuestion: string;
  errorEmpty: string;
  errorWrong: string;
  errorWrongHint: string;
  lockedPrefix: string;
};

const initialState: GateState = { status: "idle" };

function formatCountdown(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function GateForm({
  questions,
  initialQuestionId,
  messages,
}: {
  questions: QuestionOption[];
  initialQuestionId: string;
  messages: Messages;
}) {
  const [state, formAction, isPending] = useActionState(
    verifyAnswer,
    initialState,
  );
  const [questionId, setQuestionId] = useState(initialQuestionId);
  const [answer, setAnswer] = useState("");
  const [now, setNow] = useState(() => Date.now());

  // Attempts are tracked per question (see session.ts), and switching
  // questions below is purely client-side -- ignore a result that belongs
  // to a question that isn't the one currently shown, or a stale
  // error/lock would keep displaying after switching to a fresh,
  // unlocked question.
  const forCurrentQuestion = state.questionId === questionId;
  const locked =
    forCurrentQuestion && state.status === "locked" && (state.lockUntil ?? 0) > now;

  useEffect(() => {
    if (state.status !== "locked" || !forCurrentQuestion) return;
    const interval = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(interval);
  }, [state.status, forCurrentQuestion]);

  const question =
    questions.find((item) => item.id === questionId) ?? questions[0];

  function handleOtherQuestion() {
    const remaining = questions.filter((item) => item.id !== questionId);
    const next = pickRandomItem(
      remaining.length > 0 ? remaining : questions,
    );
    setQuestionId(next.id);
    setAnswer("");
  }

  return (
    <form action={formAction} className="contents" aria-busy={isPending}>
      <input type="hidden" name="questionId" value={questionId} />

      <p className="mb-4 text-pretty font-serif text-[21px] font-semibold leading-snug text-ink">
        {question?.question}
      </p>

      <Input
        name="answer"
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        placeholder={messages.answerPlaceholder}
        disabled={locked}
        autoComplete="off"
      />

      {forCurrentQuestion && state.status === "error-empty" && (
        <p className="mt-2.5 ml-0.5 animate-fade-in text-[13.5px] text-error">
          {messages.errorEmpty}
        </p>
      )}
      {forCurrentQuestion && state.status === "error-wrong" && (
        <>
          <p className="mt-2.5 ml-0.5 animate-fade-in text-[13.5px] text-error">
            {messages.errorWrong.replace(
              "__REMAINING__",
              String(state.remaining ?? 0),
            )}
          </p>
          <p className="mt-1 ml-0.5 animate-fade-in text-[13px] text-muted">
            {messages.errorWrongHint}
          </p>
        </>
      )}

      {locked && (
        <div className="mt-3.5 flex animate-fade-in items-center gap-2.5 rounded-sm border border-border-divider bg-[#f7ede0] px-3.5 py-3">
          <div className="size-2 shrink-0 rounded-full bg-terracotta" />
          <span className="text-[13.5px] text-muted-4">
            {messages.lockedPrefix}{" "}
            <b className="tabular-nums">
              {formatCountdown((state.lockUntil ?? 0) - now)}
            </b>
          </span>
        </div>
      )}

      <div className="mt-[18px] flex flex-wrap gap-2.5">
        <Button
          type="submit"
          variant="primary"
          disabled={locked || isPending}
          className="flex-1 basis-[150px]"
        >
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {isPending ? messages.submitting : messages.submit}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={handleOtherQuestion}
          className="w-full basis-full sm:w-auto sm:flex-none sm:basis-auto"
        >
          {messages.otherQuestion}
        </Button>
      </div>
    </form>
  );
}

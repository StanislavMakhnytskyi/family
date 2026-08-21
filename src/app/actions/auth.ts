"use server";

import { redirect } from "next/navigation";

import { getQuestions } from "@/lib/data";
import { normalizeAnswer } from "@/lib/utils";
import {
  createSession,
  destroySession,
  getAttemptState,
  recordFailedAttempt,
  resetAttempts,
  MAX_ATTEMPTS,
} from "@/lib/session";

export type GateStatus = "idle" | "error-empty" | "error-wrong" | "locked";

export type GateState = {
  status: GateStatus;
  remaining?: number;
  lockUntil?: number;
};

export async function verifyAnswer(
  _prevState: GateState,
  formData: FormData,
): Promise<GateState> {
  const attemptState = await getAttemptState();
  if (attemptState.lockUntil > Date.now()) {
    return { status: "locked", lockUntil: attemptState.lockUntil };
  }

  const questionId = String(formData.get("questionId") ?? "");
  const answer = String(formData.get("answer") ?? "").trim();

  if (!answer) {
    return { status: "error-empty" };
  }

  const questions = await getQuestions();
  const question = questions.find((item) => item.id === questionId);
  const normalized = normalizeAnswer(answer);
  const isCorrect =
    !!question &&
    (normalized === normalizeAnswer(question.normalizedAnswer) ||
      (question.variants ?? []).some(
        (variant) => normalized === normalizeAnswer(variant),
      ));

  if (!isCorrect) {
    const next = await recordFailedAttempt();
    if (next.lockUntil > Date.now()) {
      return { status: "locked", lockUntil: next.lockUntil };
    }
    return { status: "error-wrong", remaining: MAX_ATTEMPTS - next.count };
  }

  await resetAttempts();
  await createSession();
  redirect("/");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/gate");
}

"use server";

import { redirect } from "next/navigation";

import { getPeople, getQuestions } from "@/lib/data";
import { normalizeAnswer } from "@/lib/utils";
import {
  createSession,
  destroySession,
  getAttemptState,
  recordFailedAttempt,
  resetAttempts,
  markStageOnePassed,
  hasPassedStageOne,
  clearStageOne,
  getYearsAttemptState,
  recordYearsFailedAttempt,
  resetYearsAttempts,
  MAX_ATTEMPTS,
  YEARS_MAX_ATTEMPTS,
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
  await markStageOnePassed();
  redirect("/gate/years");
}

export type YearsStatus = "idle" | "error-incomplete" | "error-wrong" | "locked";

export type YearsState = {
  status: YearsStatus;
  remaining?: number;
  lockUntil?: number;
};

export async function verifyYears(
  _prevState: YearsState,
  formData: FormData,
): Promise<YearsState> {
  if (!(await hasPassedStageOne())) {
    redirect("/gate");
  }

  const attemptState = await getYearsAttemptState();
  if (attemptState.lockUntil > Date.now()) {
    return { status: "locked", lockUntil: attemptState.lockUntil };
  }

  const submitted = [
    String(formData.get("year1") ?? "").trim(),
    String(formData.get("year2") ?? "").trim(),
    String(formData.get("year3") ?? "").trim(),
  ];
  if (submitted.some((year) => !year)) {
    return { status: "error-incomplete" };
  }

  const people = await getPeople();
  const validYears = new Set(
    people.flatMap((person) => (person.birthDate ? [person.birthDate.slice(0, 4)] : [])),
  );
  const isCorrect = submitted.every((year) => validYears.has(year));

  if (!isCorrect) {
    const next = await recordYearsFailedAttempt();
    if (next.lockUntil > Date.now()) {
      return { status: "locked", lockUntil: next.lockUntil };
    }
    return { status: "error-wrong", remaining: YEARS_MAX_ATTEMPTS - next.count };
  }

  await resetYearsAttempts();
  await clearStageOne();
  await createSession();
  redirect("/");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/gate");
}

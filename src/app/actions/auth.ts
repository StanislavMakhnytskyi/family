"use server";

import { redirect } from "next/navigation";

import { getPeople, getQuestions } from "@/lib/data";
import { isAnswerMatch } from "@/lib/utils";
import { demoModeFlag } from "@/lib/flags";
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
  // Which question this result is about. Attempts are tracked per
  // question (see session.ts), and "Інше питання" switches questions
  // client-side with no server round trip -- without this, a stale
  // error/lock from a previous question would keep showing after
  // switching to a different, unlocked one. The client only renders the
  // error/lock UI when this matches the currently-displayed question.
  questionId?: string;
};

export async function verifyAnswer(
  _prevState: GateState,
  formData: FormData,
): Promise<GateState> {
  // The demo deployment has nothing private to protect -- let anyone
  // through regardless of what (if anything) they typed, so a stranger
  // trying the site doesn't need to guess a real family's answer.
  if (await demoModeFlag()) {
    await markStageOnePassed();
    redirect("/gate/years");
  }

  const questionId = String(formData.get("questionId") ?? "");

  const attemptState = await getAttemptState(questionId);
  if (attemptState.lockUntil > Date.now()) {
    return { status: "locked", lockUntil: attemptState.lockUntil, questionId };
  }

  const answer = String(formData.get("answer") ?? "").trim();

  if (!answer) {
    return { status: "error-empty", questionId };
  }

  const questions = await getQuestions();
  const question = questions.find((item) => item.id === questionId);
  const isCorrect =
    !!question &&
    (isAnswerMatch(answer, question.normalizedAnswer) ||
      (question.variants ?? []).some((variant) => isAnswerMatch(answer, variant)));

  if (!isCorrect) {
    const next = await recordFailedAttempt(questionId);
    if (next.lockUntil > Date.now()) {
      return { status: "locked", lockUntil: next.lockUntil, questionId };
    }
    return { status: "error-wrong", remaining: MAX_ATTEMPTS - next.count, questionId };
  }

  await resetAttempts();
  await markStageOnePassed();
  redirect("/gate/years");
}

export type YearsStatus =
  | "idle"
  | "error-incomplete"
  | "error-duplicate"
  | "error-wrong"
  | "locked";

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

  if (await demoModeFlag()) {
    await resetYearsAttempts();
    await clearStageOne();
    await createSession();
    redirect("/");
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

  // The three years are meant to name three different family members --
  // the same valid year typed three times would otherwise satisfy the
  // membership check below despite proving only one fact, not three.
  if (new Set(submitted).size !== submitted.length) {
    return { status: "error-duplicate" };
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

import "server-only";
import { cookies } from "next/headers";
import { createAttemptLockout, createKeyedAttemptLockout } from "@/lib/attempt-lockout";

export const SESSION_COOKIE = "family-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export const MAX_ATTEMPTS = 3;
export const LOCKOUT_MINUTES = 15;

// Keyed by questionId: "Інше питання" switches questions client-side with
// no server round trip, so attempts are tracked per question rather than
// as one shared counter -- a wrong guess on a question you don't know
// shouldn't cost you a try on a different one, but a question's own count
// still has to persist if you switch away and cycle back to it.
const attempts = createKeyedAttemptLockout(
  "family-gate-attempts",
  MAX_ATTEMPTS,
  LOCKOUT_MINUTES,
);
export const getAttemptState = attempts.getAttemptState;
export const recordFailedAttempt = attempts.recordFailedAttempt;
export const resetAttempts = attempts.resetAttempts;

// Second gate stage (three birth years) has its own independent lockout —
// failing it three times doesn't touch stage one's attempt count, and
// vice versa.
export const YEARS_MAX_ATTEMPTS = 3;
export const YEARS_LOCKOUT_MINUTES = 15;

const yearsAttempts = createAttemptLockout(
  "family-gate-years-attempts",
  YEARS_MAX_ATTEMPTS,
  YEARS_LOCKOUT_MINUTES,
);
export const getYearsAttemptState = yearsAttempts.getAttemptState;
export const recordYearsFailedAttempt = yearsAttempts.recordFailedAttempt;
export const resetYearsAttempts = yearsAttempts.resetAttempts;

// Marks that stage one passed, so stage two (/gate/years) can't be reached
// by navigating there directly. Short-lived — just long enough to answer
// three more questions, not a standing session.
const STAGE_ONE_COOKIE = "family-gate-stage1";
const STAGE_ONE_MAX_AGE = 60 * 15; // 15 minutes

export async function markStageOnePassed(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(STAGE_ONE_COOKIE, "1", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: STAGE_ONE_MAX_AGE,
  });
}

export async function hasPassedStageOne(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.has(STAGE_ONE_COOKIE);
}

export async function clearStageOne(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(STAGE_ONE_COOKIE);
}

export async function createSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, String(Date.now()), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete("family-gate-attempts");
  cookieStore.delete("family-gate-years-attempts");
  cookieStore.delete(STAGE_ONE_COOKIE);
}

import "server-only";
import { cookies } from "next/headers";
import { createAttemptLockout } from "@/lib/attempt-lockout";

export const SESSION_COOKIE = "family-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export const MAX_ATTEMPTS = 3;
export const LOCKOUT_MINUTES = 15;

const attempts = createAttemptLockout(
  "family-gate-attempts",
  MAX_ATTEMPTS,
  LOCKOUT_MINUTES,
);
export const getAttemptState = attempts.getAttemptState;
export const recordFailedAttempt = attempts.recordFailedAttempt;
export const resetAttempts = attempts.resetAttempts;

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
}

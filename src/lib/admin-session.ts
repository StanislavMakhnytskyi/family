import "server-only";
import { cookies } from "next/headers";
import { createAttemptLockout } from "@/lib/attempt-lockout";

export const ADMIN_SESSION_COOKIE = "admin-session";
const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

export const ADMIN_MAX_ATTEMPTS = 3;
export const ADMIN_LOCKOUT_MINUTES = 15;

const attempts = createAttemptLockout(
  "admin-gate-attempts",
  ADMIN_MAX_ATTEMPTS,
  ADMIN_LOCKOUT_MINUTES,
);
export const getAdminAttemptState = attempts.getAttemptState;
export const recordAdminFailedAttempt = attempts.recordFailedAttempt;
export const resetAdminAttempts = attempts.resetAttempts;

export async function createAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, String(Date.now()), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE,
  });
}

export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  cookieStore.delete("admin-gate-attempts");
  cookieStore.delete("admin-data-source");
}

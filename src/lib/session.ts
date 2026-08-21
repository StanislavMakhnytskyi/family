import "server-only";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "family-session";
const ATTEMPTS_COOKIE = "family-gate-attempts";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export const MAX_ATTEMPTS = 3;
export const LOCKOUT_MINUTES = 15;

export type AttemptState = { count: number; lockUntil: number };

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
  cookieStore.delete(ATTEMPTS_COOKIE);
}

export async function getAttemptState(): Promise<AttemptState> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(ATTEMPTS_COOKIE)?.value;
  if (!raw) return { count: 0, lockUntil: 0 };
  try {
    const parsed = JSON.parse(raw) as Partial<AttemptState>;
    return {
      count: typeof parsed.count === "number" ? parsed.count : 0,
      lockUntil: typeof parsed.lockUntil === "number" ? parsed.lockUntil : 0,
    };
  } catch {
    return { count: 0, lockUntil: 0 };
  }
}

async function setAttemptState(state: AttemptState): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ATTEMPTS_COOKIE, JSON.stringify(state), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });
}

export async function recordFailedAttempt(): Promise<AttemptState> {
  const current = await getAttemptState();
  const count = current.count + 1;

  if (count >= MAX_ATTEMPTS) {
    const next: AttemptState = {
      count: 0,
      lockUntil: Date.now() + LOCKOUT_MINUTES * 60_000,
    };
    await setAttemptState(next);
    return next;
  }

  const next: AttemptState = { count, lockUntil: 0 };
  await setAttemptState(next);
  return next;
}

export async function resetAttempts(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ATTEMPTS_COOKIE);
}

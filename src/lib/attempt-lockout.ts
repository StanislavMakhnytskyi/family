import "server-only";
import { cookies } from "next/headers";

export type AttemptState = { count: number; lockUntil: number };

/**
 * Cookie-backed attempt counter + timed lockout, shared by the family gate
 * and the admin login so both survive dev server reloads / multiple
 * instances without needing in-memory state.
 */
export function createAttemptLockout(
  cookieName: string,
  maxAttempts: number,
  lockoutMinutes: number,
) {
  async function getAttemptState(): Promise<AttemptState> {
    const cookieStore = await cookies();
    const raw = cookieStore.get(cookieName)?.value;
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
    cookieStore.set(cookieName, JSON.stringify(state), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });
  }

  async function recordFailedAttempt(): Promise<AttemptState> {
    const current = await getAttemptState();
    const count = current.count + 1;

    if (count >= maxAttempts) {
      const next: AttemptState = {
        count: 0,
        lockUntil: Date.now() + lockoutMinutes * 60_000,
      };
      await setAttemptState(next);
      return next;
    }

    const next: AttemptState = { count, lockUntil: 0 };
    await setAttemptState(next);
    return next;
  }

  async function resetAttempts(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(cookieName);
  }

  return { getAttemptState, recordFailedAttempt, resetAttempts };
}

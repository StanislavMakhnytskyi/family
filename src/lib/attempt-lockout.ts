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

export type PerKeyAttemptState = Record<string, AttemptState>;

/**
 * Like createAttemptLockout(), but tracks a separate {count, lockUntil}
 * per key in one cookie (a JSON map) instead of a single shared counter.
 * Used by the family gate's shared-question step: each question can be
 * switched to freely ("Інше питання" is client-side, no server round
 * trip), so a wrong guess on one question shouldn't cost an attempt
 * against a *different* question the person might actually know — but the
 * count for a given question must still persist across switching away and
 * back to it, not reset just because the question cycled.
 */
export function createKeyedAttemptLockout(
  cookieName: string,
  maxAttempts: number,
  lockoutMinutes: number,
) {
  async function getAllStates(): Promise<PerKeyAttemptState> {
    const cookieStore = await cookies();
    const raw = cookieStore.get(cookieName)?.value;
    if (!raw) return {};
    try {
      const parsed: unknown = JSON.parse(raw);
      return typeof parsed === "object" && parsed !== null
        ? (parsed as PerKeyAttemptState)
        : {};
    } catch {
      return {};
    }
  }

  async function setAllStates(states: PerKeyAttemptState): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(cookieName, JSON.stringify(states), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });
  }

  async function getAttemptState(key: string): Promise<AttemptState> {
    const all = await getAllStates();
    return all[key] ?? { count: 0, lockUntil: 0 };
  }

  async function recordFailedAttempt(key: string): Promise<AttemptState> {
    const all = await getAllStates();
    const current = all[key] ?? { count: 0, lockUntil: 0 };
    const count = current.count + 1;

    const next: AttemptState =
      count >= maxAttempts
        ? { count: 0, lockUntil: Date.now() + lockoutMinutes * 60_000 }
        : { count, lockUntil: 0 };
    await setAllStates({ ...all, [key]: next });
    return next;
  }

  async function resetAttempts(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(cookieName);
  }

  return { getAttemptState, recordFailedAttempt, resetAttempts };
}

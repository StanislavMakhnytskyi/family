"use server";

import { redirect } from "next/navigation";
import { verifyPassword } from "@/lib/admin-password";
import { demoModeFlag } from "@/lib/flags";
import {
  createAdminSession,
  destroyAdminSession,
  getAdminAttemptState,
  recordAdminFailedAttempt,
  resetAdminAttempts,
  ADMIN_MAX_ATTEMPTS,
} from "@/lib/admin-session";

export type AdminLoginStatus = "idle" | "error-invalid" | "locked";

export type AdminLoginState = {
  status: AdminLoginStatus;
  remaining?: number;
  lockUntil?: number;
};

export async function verifyAdminLogin(
  _prevState: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  // proxy.ts already blocks every /admin/* request with a 404 in demo mode
  // -- this page should be unreachable -- but refuse here too rather than
  // trust that alone, same as the private media route re-checks its own
  // session cookie instead of relying only on proxy.ts.
  if (await demoModeFlag()) {
    return { status: "error-invalid" };
  }

  const attemptState = await getAdminAttemptState();
  if (attemptState.lockUntil > Date.now()) {
    return { status: "locked", lockUntil: attemptState.lockUntil };
  }

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedHash = process.env.ADMIN_PASSWORD_HASH;

  const isValid =
    Boolean(expectedUsername) &&
    Boolean(expectedHash) &&
    username === expectedUsername &&
    verifyPassword(password, expectedHash!);

  if (!isValid) {
    const next = await recordAdminFailedAttempt();
    if (next.lockUntil > Date.now()) {
      return { status: "locked", lockUntil: next.lockUntil };
    }
    return { status: "error-invalid", remaining: ADMIN_MAX_ATTEMPTS - next.count };
  }

  await resetAdminAttempts();
  await createAdminSession();
  redirect("/admin");
}

export async function logoutAdmin(): Promise<void> {
  await destroyAdminSession();
  redirect("/admin/login");
}

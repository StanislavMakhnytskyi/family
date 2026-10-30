import { cookies } from "next/headers";

export const ADMIN_FLASH_COOKIE = "admin-flash";

export type AdminFlash = "saved" | "deleted";

// A one-shot message for the page an admin action redirects to. It is a
// short-lived cookie rather than a query string so the list URLs stay clean;
// AdminFlash (client) shows it and clears it.
export async function setAdminFlash(kind: AdminFlash): Promise<void> {
  // The timestamp makes every action produce a distinct value, so the page
  // notices a repeat of the same kind (e.g. two deletes in a row).
  (await cookies()).set(ADMIN_FLASH_COOKIE, `${kind}.${Date.now()}`, {
    path: "/admin",
    maxAge: 30,
    sameSite: "lax",
  });
}

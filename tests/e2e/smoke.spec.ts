import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("gate login, tree rendering, and navigation to a person page", async ({
  page,
}) => {
  await login(page);
  await expect(page.getByText("Богдан Савченко")).toBeVisible();

  await page.getByText("Богдан Савченко").click();
  await expect(page).toHaveURL(/\/person\/bohdan-savchenko$/);
  await expect(page.getByRole("heading", { name: "Богдан Савченко" })).toBeVisible();
});

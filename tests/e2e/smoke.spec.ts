import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("gate login, tree rendering, and navigation to a person page", async ({
  page,
}) => {
  await login(page);
  await expect(page.getByText("Іван Ковальський")).toBeVisible();

  await page.getByText("Іван Ковальський").click();
  await expect(page).toHaveURL(/\/person\/ivan$/);
  await expect(page.getByRole("heading", { name: "Іван Ковальський" })).toBeVisible();
});

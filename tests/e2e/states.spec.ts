import { test, expect } from "@playwright/test";
import { TEST_ADMIN_USERNAME, TEST_ADMIN_PASSWORD } from "./admin-test-credentials";
import { login } from "./helpers";

test("an unknown person shows the friendly not-found page", async ({ page }) => {
  await login(page);
  await page.goto("/person/nobody-here");
  await expect(page.getByRole("heading", { name: "Сторінку не знайдено" })).toBeVisible();
  await page.getByRole("link", { name: "До дерева" }).click();
  await expect(page.getByTestId("tree-card").first()).toBeVisible();
});

test("the person page header has a labelled navigation with the logo on the left", async ({
  page,
}) => {
  await login(page);
  await page.goto("/person/yaroslav-savchenko");
  const nav = page.getByRole("navigation", { name: "Основна навігація" });
  await expect(nav.getByRole("link", { name: "Родинна історія" })).toBeVisible();
  await expect(nav.getByRole("link", { name: /Дерево/ })).toBeVisible();
});

test("admin: current section is marked, and delete needs a confirmation", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByPlaceholder("Логін").fill(TEST_ADMIN_USERNAME);
  await page.getByPlaceholder("Пароль").fill(TEST_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Увійти" }).click();
  await page.getByRole("button", { name: "Обрати" }).first().click();
  await expect(page).toHaveURL(/\/admin\/people$/);

  await expect(page.getByRole("link", { name: "Люди", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );

  const rows = page.locator("tbody tr");
  const before = await rows.count();
  await rows.first().getByRole("button", { name: "Видалити" }).click();
  await expect(rows.first().getByRole("button", { name: "Підтвердити" })).toBeVisible();
  await rows.first().getByRole("button", { name: "Скасувати" }).click();
  await expect(rows.first().getByRole("button", { name: "Видалити" })).toBeVisible();
  await expect(rows).toHaveCount(before);
});

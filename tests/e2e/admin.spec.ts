import { test, expect } from "@playwright/test";
import { TEST_ADMIN_USERNAME, TEST_ADMIN_PASSWORD } from "./admin-test-credentials";

test.describe("admin panel", () => {
  test("redirects to /admin/login when unauthenticated", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);

    await page.goto("/admin/people");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("wrong credentials show an error and eventually lock out", async ({
    page,
  }) => {
    await page.goto("/admin/login");

    for (let attempt = 1; attempt <= 2; attempt++) {
      await page.getByPlaceholder("Логін").fill(TEST_ADMIN_USERNAME);
      await page.getByPlaceholder("Пароль").fill("wrong password");
      await page.getByRole("button", { name: "Увійти" }).click();
      await expect(page.getByText(/Невірний логін або пароль/)).toBeVisible();
    }

    // Third wrong attempt should trigger the lockout.
    await page.getByPlaceholder("Логін").fill(TEST_ADMIN_USERNAME);
    await page.getByPlaceholder("Пароль").fill("wrong password");
    await page.getByRole("button", { name: "Увійти" }).click();
    await expect(page.getByText(/Спробуйте через/)).toBeVisible();
  });

  test("correct credentials reach the source picker, then the people list", async ({
    page,
  }) => {
    await page.goto("/admin/login");
    await page.getByPlaceholder("Логін").fill(TEST_ADMIN_USERNAME);
    await page.getByPlaceholder("Пароль").fill(TEST_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Увійти" }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await expect(
      page.getByRole("heading", { name: "Джерело даних" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Обрати" }).first().click();

    await expect(page).toHaveURL(/\/admin\/people$/);
    await expect(page.getByText("Іван Ковальський")).toBeVisible();
  });
});

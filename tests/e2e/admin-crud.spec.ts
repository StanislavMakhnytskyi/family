import { test, expect } from "@playwright/test";
import { TEST_ADMIN_USERNAME, TEST_ADMIN_PASSWORD } from "./admin-test-credentials";

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/admin/login");
  await page.getByPlaceholder("Логін").fill(TEST_ADMIN_USERNAME);
  await page.getByPlaceholder("Пароль").fill(TEST_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Увійти" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.getByRole("button", { name: "Обрати" }).first().click(); // local files
  await expect(page).toHaveURL(/\/admin\/people$/);
}

// Exercises the full local-file write round trip: create through the form,
// confirm it's actually persisted and visible, then delete it again so the
// tracked src/data/questions.json ends up unchanged.
test("creating and deleting a question round-trips through local src/data files", async ({
  page,
}) => {
  await loginAsAdmin(page);

  await page.goto("/admin/questions/new");
  await page.getByLabel("Питання").fill("E2E тестове питання?");
  await page.getByLabel("Відповідь").fill("e2e-answer");
  await page.getByRole("button", { name: "Зберегти" }).click();

  await expect(page).toHaveURL(/\/admin\/questions$/);
  const row = page.getByRole("row", { name: /E2E тестове питання/ });
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: "Видалити" }).click();
  await expect(page).toHaveURL(/\/admin\/questions$/);
  await expect(
    page.getByRole("row", { name: /E2E тестове питання/ }),
  ).toHaveCount(0);
});

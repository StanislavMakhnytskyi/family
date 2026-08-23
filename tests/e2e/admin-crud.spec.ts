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

// Regression test: the grave form's personId <select> is disabled on edit
// (the person a grave belongs to can't be changed), but a disabled field
// doesn't get included in FormData on submit -- editing a grave without
// touching that field must still save, not fail with "Оберіть людину."
test("editing a grave without changing its person still saves", async ({
  page,
}) => {
  await loginAsAdmin(page);

  await page.goto("/admin/graves/new");
  // index 1 (the first real person) already has a grave in the seed data —
  // pick index 2 so this hits the "create new" path, not the duplicate guard.
  await page.locator("select[name=personId]").selectOption({ index: 2 });
  await page.getByLabel("Широта").fill("48.1");
  await page.getByLabel("Довгота").fill("35.1");
  await page.getByRole("button", { name: "Зберегти" }).click();
  await expect(page).toHaveURL(/\/admin\/graves$/);

  const row = page.getByRole("row").filter({ hasText: "48.1" });
  await expect(row).toBeVisible();
  await row.getByRole("link", { name: "Редагувати" }).click();

  await page.getByLabel("Широта").fill("48.2");
  await page.getByRole("button", { name: "Зберегти" }).click();

  await expect(page).toHaveURL(/\/admin\/graves$/);
  await expect(page.getByText("Оберіть людину")).toHaveCount(0);
  await expect(page.getByRole("row").filter({ hasText: "48.2" })).toBeVisible();

  await page
    .getByRole("row")
    .filter({ hasText: "48.2" })
    .getByRole("button", { name: "Видалити" })
    .click();
  await expect(page).toHaveURL(/\/admin\/graves$/);
});

// A photo can show several family members, so the media form tags it with
// a checkbox per person (personIds: string[]) rather than one <select>.
// Uploading needs a real Vercel Blob store connected -- if none is
// available (the common case in local dev, see AGENTS.md), the form surfaces
// that as an error rather than saving, and this test skips itself instead of
// failing, since it's a missing-infra problem, not a code bug.
test("tagging a media item with multiple people round-trips through local src/data files", async ({
  page,
}) => {
  await loginAsAdmin(page);

  await page.goto("/admin/media/new");
  await page.locator('input[type=checkbox][value="yaroslav-savchenko"]').check();
  await page.locator('input[type=checkbox][value="natalia-savchenko"]').check();
  await page.setInputFiles(
    'input[type=file][name="file"]',
    "public/images/placeholders/photo-2.svg",
  );
  await page.getByLabel("Підпис").fill("E2E тестове фото");
  await page.getByRole("button", { name: "Зберегти" }).click();

  try {
    await page.waitForURL(/\/admin\/media$/, { timeout: 5000 });
  } catch {
    const blobError = page.getByText(/No blob credentials/);
    if (await blobError.isVisible().catch(() => false)) {
      test.skip(true, "No Vercel Blob store connected -- can't exercise a real upload here");
    }
    throw new Error("Save did not redirect and no known blob-credentials error was shown");
  }
  let row = page.getByRole("row", { name: /E2E тестове фото/ });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Ярослав Савченко");
  await expect(row).toContainText("Наталія Савченко");

  await row.getByRole("link", { name: "Редагувати" }).click();
  await expect(page.locator('input[type=checkbox][value="yaroslav-savchenko"]')).toBeChecked();
  await expect(page.locator('input[type=checkbox][value="natalia-savchenko"]')).toBeChecked();
  await page.locator('input[type=checkbox][value="natalia-savchenko"]').uncheck();
  await page.getByRole("button", { name: "Зберегти" }).click();

  await expect(page).toHaveURL(/\/admin\/media$/);
  row = page.getByRole("row", { name: /E2E тестове фото/ });
  await expect(row).toContainText("Ярослав Савченко");
  await expect(row).not.toContainText("Наталія Савченко");

  await row.getByRole("button", { name: "Видалити" }).click();
  await expect(page).toHaveURL(/\/admin\/media$/);
  await expect(page.getByRole("row", { name: /E2E тестове фото/ })).toHaveCount(0);
});

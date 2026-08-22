import { test, expect } from "@playwright/test";
import questions from "../../src/data/questions.json";
import people from "../../src/data/people.json";

const validYears = [...new Set(people.map((p) => p.birthDate.slice(0, 4)))];

async function passStageOne(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/gate");
  const questionText = await page
    .locator("form p", { hasText: /.+/ })
    .first()
    .innerText();
  const question = questions.find((item) => item.question === questionText);
  expect(question).toBeDefined();
  await page.getByPlaceholder("Ваша відповідь").fill(question!.normalizedAnswer);
  await page.getByRole("button", { name: "Увійти" }).click();
  await expect(page).toHaveURL(/\/gate\/years$/);
}

test.describe("second login stage (birth years)", () => {
  test("visiting /gate/years directly, without stage one, redirects to /gate", async ({
    page,
  }) => {
    await page.goto("/gate/years");
    await expect(page).toHaveURL(/\/gate$/);
  });

  test("wrong years show an error and eventually lock out, independently of stage one", async ({
    page,
  }) => {
    await passStageOne(page);

    for (let attempt = 1; attempt <= 2; attempt++) {
      const inputs = page.getByPlaceholder("РРРР");
      await inputs.nth(0).fill("1800");
      await inputs.nth(1).fill("1801");
      await inputs.nth(2).fill("1802");
      await page.getByRole("button", { name: "Увійти" }).click();
      await expect(page.getByText(/Не всі роки збігаються/)).toBeVisible();
    }

    const inputs = page.getByPlaceholder("РРРР");
    await inputs.nth(0).fill("1800");
    await inputs.nth(1).fill("1801");
    await inputs.nth(2).fill("1802");
    await page.getByRole("button", { name: "Увійти" }).click();
    await expect(page.getByText(/Спробуйте через/)).toBeVisible();

    // Stage two's lockout doesn't touch stage one — going back to /gate and
    // answering correctly should still land on /gate/years, not be locked
    // out from stage one's side.
    await page.goto("/gate");
    const questionText = await page
      .locator("form p", { hasText: /.+/ })
      .first()
      .innerText();
    const question = questions.find((item) => item.question === questionText);
    await page.getByPlaceholder("Ваша відповідь").fill(question!.normalizedAnswer);
    await page.getByRole("button", { name: "Увійти" }).click();
    await expect(page).toHaveURL(/\/gate\/years$/);
  });

  test("three correct years complete login", async ({ page }) => {
    await passStageOne(page);

    const inputs = page.getByPlaceholder("РРРР");
    await inputs.nth(0).fill(validYears[0]);
    await inputs.nth(1).fill(validYears[1]);
    await inputs.nth(2).fill(validYears[2]);
    await page.getByRole("button", { name: "Увійти" }).click();

    await expect(page).toHaveURL("http://localhost:3000/");
  });
});

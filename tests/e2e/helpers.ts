import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import questions from "../../src/data/questions.json";

export async function login(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page).toHaveURL(/\/gate$/);

  const questionText = await page
    .locator("form p", { hasText: /.+/ })
    .first()
    .innerText();
  const question = questions.find((item) => item.question === questionText);
  expect(question).toBeDefined();

  await page.getByPlaceholder("Ваша відповідь").fill(question!.normalizedAnswer);
  await page.getByRole("button", { name: "Увійти" }).click();
  await expect(page).toHaveURL("http://localhost:3000/");
}

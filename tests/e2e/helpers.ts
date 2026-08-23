import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import questions from "../../src/data/questions.json";
import people from "../../src/data/people.json";

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

  // Second stage: three birth years of any family members.
  await expect(page).toHaveURL(/\/gate\/years$/);
  const years = [
    ...new Set(people.flatMap((p) => (p.birthDate ? [p.birthDate.slice(0, 4)] : []))),
  ].slice(0, 3);
  const yearInputs = page.getByPlaceholder("РРРР");
  for (let i = 0; i < 3; i++) {
    await yearInputs.nth(i).fill(years[i]);
  }
  await page.getByRole("button", { name: "Увійти" }).click();

  await expect(page).toHaveURL("http://localhost:3000/");
}

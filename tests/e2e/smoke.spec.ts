import { test, expect } from "@playwright/test";
import questions from "../../src/data/questions.json";

test("gate login, tree rendering, and navigation to a person page", async ({
  page,
}) => {
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
  await expect(page.getByText("Іван Ковальський")).toBeVisible();

  await page.getByText("Іван Ковальський").click();
  await expect(page).toHaveURL(/\/person\/ivan$/);
  await expect(page.getByRole("heading", { name: "Іван Ковальський" })).toBeVisible();
});

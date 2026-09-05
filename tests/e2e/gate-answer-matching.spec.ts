import { test, expect } from "@playwright/test";
import questions from "../../src/data/questions.json";

// q6 is the only seeded question with a multi-word answer -- the gate
// picks a random question, so cycle "Інше питання" (client-side, no
// server round trip) until it comes up.
const multiWordQuestion = questions.find((q) => q.id === "q6")!;

async function showMultiWordQuestion(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.goto("/gate");
  for (let attempt = 0; attempt < 30; attempt++) {
    const text = await page
      .locator("form p", { hasText: /.+/ })
      .first()
      .innerText();
    if (text === multiWordQuestion.question) return;
    await page.getByRole("button", { name: "Інше питання" }).click();
  }
  throw new Error("Gate never showed the multi-word question after 30 tries");
}

test.describe("multi-word answer matching on the shared-question gate step", () => {
  test("accepts the required words in a different order, without the connector", async ({
    page,
  }) => {
    await showMultiWordQuestion(page);
    await page.getByPlaceholder("Ваша відповідь").fill("наталія ярослав");
    await page.getByRole("button", { name: "Увійти" }).click();
    await expect(page).toHaveURL(/\/gate\/years$/);
  });

  test("accepts extra words the user adds around the required ones", async ({
    page,
  }) => {
    await showMultiWordQuestion(page);
    await page.getByPlaceholder("Ваша відповідь").fill("ярослав і сестра наталія");
    await page.getByRole("button", { name: "Увійти" }).click();
    await expect(page).toHaveURL(/\/gate\/years$/);
  });

  test("still rejects an answer missing one of the required words", async ({
    page,
  }) => {
    await showMultiWordQuestion(page);
    await page.getByPlaceholder("Ваша відповідь").fill("ярослав");
    await page.getByRole("button", { name: "Увійти" }).click();
    await expect(page.getByText(/Неправильна відповідь/)).toBeVisible();
  });
});

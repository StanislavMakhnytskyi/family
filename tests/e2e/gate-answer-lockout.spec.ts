import { test, expect } from "@playwright/test";
import questions from "../../src/data/questions.json";

const questionA = questions.find((q) => q.id === "q1")!; // "рекс"
const questionB = questions.find((q) => q.id === "q4")!; // "калинівка"

async function showQuestion(
  page: import("@playwright/test").Page,
  target: { question: string },
): Promise<void> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const text = await page
      .locator("form p", { hasText: /.+/ })
      .first()
      .innerText();
    if (text === target.question) return;
    await page.getByRole("button", { name: "Інше питання" }).click();
  }
  throw new Error(`Gate never showed "${target.question}" after 30 tries`);
}

test.describe("per-question attempt tracking on the shared-question gate step", () => {
  test("locks only the question that was guessed wrong, and switching to another question still works", async ({
    page,
  }) => {
    await page.goto("/gate");
    await showQuestion(page, questionA);

    for (let attempt = 1; attempt <= 2; attempt++) {
      await page.getByPlaceholder("Ваша відповідь").fill("wrong-answer");
      await page.getByRole("button", { name: "Увійти" }).click();
      await expect(page.getByText(/Неправильна відповідь/)).toBeVisible();
      // The hint next to the wrong-answer error.
      await expect(page.getByText(/Не знаєте відповіді/)).toBeVisible();
    }

    // Third wrong guess locks this question.
    await page.getByPlaceholder("Ваша відповідь").fill("wrong-answer");
    await page.getByRole("button", { name: "Увійти" }).click();
    await expect(page.getByText(/Спробуйте через/)).toBeVisible();

    // The escape hatch: switching to a different question must not be
    // blocked by the current question's lock, and that question must be
    // fully usable (not locked itself).
    await showQuestion(page, questionB);
    await expect(page.getByText(/Спробуйте через/)).not.toBeVisible();
    await page.getByPlaceholder("Ваша відповідь").fill(questionB.normalizedAnswer);
    await page.getByRole("button", { name: "Увійти" }).click();
    await expect(page).toHaveURL(/\/gate\/years$/);
  });

  test("a question's lock persists even after cycling away and back to it", async ({
    page,
  }) => {
    await page.goto("/gate");
    await showQuestion(page, questionA);

    for (let attempt = 1; attempt <= 2; attempt++) {
      await page.getByPlaceholder("Ваша відповідь").fill("wrong-answer");
      await page.getByRole("button", { name: "Увійти" }).click();
      await expect(page.getByText(/Неправильна відповідь/)).toBeVisible();
    }
    await page.getByPlaceholder("Ваша відповідь").fill("wrong-answer");
    await page.getByRole("button", { name: "Увійти" }).click();
    await expect(page.getByText(/Спробуйте через/)).toBeVisible();

    // Cycle through other questions and back to the locked one -- its
    // lock must still be in effect, not reset by having switched away.
    await showQuestion(page, questionB);
    await showQuestion(page, questionA);
    await expect(page.getByText(/Спробуйте через/)).toBeVisible();
    await expect(page.getByPlaceholder("Ваша відповідь")).toBeDisabled();
  });
});

test.describe("gate form layout", () => {
  test("'Інше питання' spans the full width on a mobile viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/gate");

    const otherQuestionButton = page.getByRole("button", { name: "Інше питання" });
    const submitButton = page.getByRole("button", { name: "Увійти" });

    const otherBox = await otherQuestionButton.boundingBox();
    const submitBox = await submitButton.boundingBox();
    expect(otherBox).not.toBeNull();
    expect(submitBox).not.toBeNull();
    // Full-width and stacked below the submit button, not side by side.
    expect(otherBox!.width).toBeGreaterThanOrEqual(submitBox!.width);
    expect(otherBox!.y).toBeGreaterThan(submitBox!.y);
  });
});

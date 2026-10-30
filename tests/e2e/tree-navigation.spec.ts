import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("family tree navigation", () => {
  test("tree cards are real links reachable by keyboard", async ({ page }) => {
    await login(page);
    const card = page.getByTestId("tree-card").first();
    await expect(card).toHaveAttribute("href", /^\/person\//);

    await card.focus();
    await expect(card).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/person\//);
  });

  test("searching for a person centres and highlights their card", async ({ page }) => {
    await login(page);
    await page.getByRole("searchbox", { name: "Знайти людину" }).fill("Ярослав");
    await page.getByTestId("tree-search-results").getByRole("button").first().click();

    const highlighted = page.locator('[data-testid="tree-card"][aria-current="true"]');
    await expect(highlighted).toHaveCount(1);
    await expect(highlighted).toContainText("Ярослав");
    await expect(highlighted).toBeInViewport();
  });

  test("search says so when nobody matches", async ({ page }) => {
    await login(page);
    await page.getByRole("searchbox", { name: "Знайти людину" }).fill("яяяя");
    await expect(page.getByTestId("tree-search-results")).toContainText("Нікого не знайдено");
  });

  test("the hint can be dismissed and stays dismissed", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Сховати підказку" }).click();
    await expect(page.getByRole("button", { name: "Сховати підказку" })).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId("tree-card").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Сховати підказку" })).toHaveCount(0);
  });

  test("on a phone the first view stays readable instead of shrinking the whole tree", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 780 });
    await login(page);
    await expect(page.getByTestId("tree-card").first()).toBeVisible();
    const scale = await page
      .getByTestId("tree-world")
      .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);
    expect(scale).toBeGreaterThanOrEqual(0.49);
  });
});

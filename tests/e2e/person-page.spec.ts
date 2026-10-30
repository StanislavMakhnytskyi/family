import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("person page", () => {
  test("'show on the tree' returns to the tree centred on that person", async ({ page }) => {
    await login(page);
    await page.goto("/person/yaroslav-savchenko");
    await page.getByRole("link", { name: "Показати на дереві" }).click();
    await expect(page).toHaveURL(/\/\?focus=yaroslav-savchenko/);

    const highlighted = page.locator('[data-testid="tree-card"][aria-current="true"]');
    await expect(highlighted).toHaveCount(1);
    await expect(highlighted).toContainText("Ярослав");
    await expect(highlighted).toBeInViewport();
  });

  test("an unknown focus id is ignored", async ({ page }) => {
    await login(page);
    await page.goto("/?focus=nobody-here");
    await expect(page.getByTestId("tree-card").first()).toBeVisible();
    await expect(page.locator('[data-testid="tree-card"][aria-current="true"]')).toHaveCount(0);
  });

  test("family lists parents, then spouses, siblings and children", async ({ page }) => {
    await login(page);
    await page.goto("/person/yaroslav-savchenko");
    const headings = await page.locator("main h3").allTextContents();
    const order = ["Батьки", "Подружжя", "Брати/сестри", "Діти"];
    const present = headings.filter((h) => order.includes(h));
    expect(present).toEqual(order.filter((h) => present.includes(h)));
  });
});

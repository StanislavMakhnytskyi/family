import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("family tree layout", () => {
  test("tree viewport fills the screen with no page scroll", async ({
    page,
  }) => {
    await login(page);
    await expect(page.getByText("Іван Ковальський")).toBeVisible();

    const hasNoPageScroll = await page.evaluate(
      () => document.documentElement.scrollHeight <= window.innerHeight + 1,
    );
    expect(hasNoPageScroll).toBe(true);

    const viewportHeight = page.viewportSize()!.height;
    const box = await page.getByTestId("tree-viewport").boundingBox();
    expect(box).not.toBeNull();
    // The tree area should take up nearly all vertical space below the header,
    // not collapse to its content's natural (~300px) size.
    expect(box!.height).toBeGreaterThan(viewportHeight * 0.7);
  });

  test("zoom controls are visible and change the rendered scale", async ({
    page,
  }) => {
    await login(page);
    await expect(page.getByText("Іван Ковальський")).toBeVisible();

    const zoomIn = page.getByRole("button", { name: "Збільшити" });
    const zoomOut = page.getByRole("button", { name: "Зменшити" });
    const reset = page.getByRole("button", { name: "Скинути масштаб" });
    await expect(zoomIn).toBeVisible();
    await expect(zoomOut).toBeVisible();
    await expect(reset).toBeVisible();

    // family-chart applies the pan/zoom transform as a CSS `style.transform`
    // on the `.view` group (not an SVG `transform` attribute), so it must be
    // read via computed style.
    const view = page.locator(".view").first();
    const readTransform = () =>
      view.evaluate((el) => getComputedStyle(el).transform);

    const initialTransform = await readTransform();

    await zoomIn.click();
    await expect.poll(readTransform).not.toBe(initialTransform);

    const zoomedInTransform = await readTransform();

    await zoomOut.click();
    await expect.poll(readTransform).not.toBe(zoomedInTransform);

    const beforeReset = await readTransform();
    await reset.click();
    await expect.poll(readTransform).not.toBe(beforeReset);
  });

  test("connector lines between relatives are visible against the background", async ({
    page,
  }) => {
    await login(page);
    await expect(page.getByText("Іван Ковальський")).toBeVisible();

    const linkCount = await page.locator("path.link").count();
    // 9 people / 8 parent-child + spouse relationships in the seed data.
    expect(linkCount).toBeGreaterThan(0);

    const strokes = await page
      .locator("path.link")
      .evaluateAll((links) => links.map((el) => getComputedStyle(el).stroke));

    for (const stroke of strokes) {
      // family-chart's default link color is white (#fff), which is
      // invisible against our cream page background unless overridden.
      expect(stroke).not.toBe("rgb(255, 255, 255)");
      expect(stroke).not.toBe("rgba(0, 0, 0, 0)");
      expect(stroke).not.toBe("none");
    }
  });
});

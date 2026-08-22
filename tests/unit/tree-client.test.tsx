import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { TreeClient } from "@/components/client/TreeClient";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

afterEach(cleanup);

// Empty people/relationships short-circuits the fit-to-screen effect (no
// nodes means totalWidth/totalHeight stay 0), so these assert the
// component's own static contract (classes/markup it always renders)
// without needing real layout data or a DOM with real element sizes.
describe("TreeClient", () => {
  it("renders zoom in, zoom out, and reset controls", () => {
    render(<TreeClient people={[]} relationships={[]} hint="перетягніть" />);
    expect(screen.getByRole("button", { name: "Збільшити" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Зменшити" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Скинути масштаб" }),
    ).toBeTruthy();
  });

  it("renders the given hint text", () => {
    render(
      <TreeClient
        people={[]}
        relationships={[]}
        hint="перетягніть · колесо для масштабу"
      />,
    );
    expect(
      screen.getByText("перетягніть · колесо для масштабу"),
    ).toBeTruthy();
  });

  it("sizes the chart viewport to fill its flex parent instead of collapsing to content size", () => {
    render(<TreeClient people={[]} relationships={[]} hint="перетягніть" />);
    const viewport = screen.getByTestId("tree-viewport");
    const canvas = screen.getByTestId("tree-canvas");
    // flex-1 on the outer viewport + absolute inset-0 on the canvas is what
    // makes the tree fill available space instead of its ~300px natural size.
    expect(viewport.className).toContain("flex-1");
    expect(canvas.className).toContain("absolute");
    expect(canvas.className).toContain("inset-0");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { TreeClient } from "@/components/client/TreeClient";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

afterEach(cleanup);

// data=[] short-circuits TreeClient's effect before it touches family-chart,
// so these assert the component's own static contract (classes/markup it
// always renders) without needing to mock the charting library.
describe("TreeClient", () => {
  it("puts the family-chart 'f3' class on the chart canvas so the library's own stylesheet (e.g. link stroke color) applies", () => {
    render(<TreeClient data={[]} hint="перетягніть" />);
    const canvas = screen.getByTestId("tree-canvas");
    expect(canvas.className.split(" ")).toContain("f3");
  });

  it("renders zoom in, zoom out, and reset controls", () => {
    render(<TreeClient data={[]} hint="перетягніть" />);
    expect(screen.getByRole("button", { name: "Збільшити" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Зменшити" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Скинути масштаб" }),
    ).toBeTruthy();
  });

  it("renders the given hint text", () => {
    render(<TreeClient data={[]} hint="перетягніть · колесо для масштабу" />);
    expect(
      screen.getByText("перетягніть · колесо для масштабу"),
    ).toBeTruthy();
  });

  it("sizes the chart viewport to fill its flex parent instead of collapsing to content size", () => {
    render(<TreeClient data={[]} hint="перетягніть" />);
    const viewport = screen.getByTestId("tree-viewport");
    const canvas = screen.getByTestId("tree-canvas");
    // flex-1 on the outer viewport + absolute inset-0 on the canvas is what
    // makes the tree fill available space instead of its ~300px natural size.
    expect(viewport.className).toContain("flex-1");
    expect(canvas.className).toContain("absolute");
    expect(canvas.className).toContain("inset-0");
  });
});

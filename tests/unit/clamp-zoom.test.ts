import { describe, expect, it } from "vitest";
import { clampZoom, ZOOM_MAX, ZOOM_MIN } from "@/lib/utils";

describe("clampZoom", () => {
  it("returns the value unchanged when within bounds", () => {
    expect(clampZoom(1)).toBe(1);
  });

  it("clamps to the minimum when below it", () => {
    expect(clampZoom(0.01)).toBe(ZOOM_MIN);
  });

  it("clamps to the maximum when above it", () => {
    expect(clampZoom(50)).toBe(ZOOM_MAX);
  });

  it("respects custom min/max bounds", () => {
    expect(clampZoom(0.5, 0.6, 3)).toBe(0.6);
    expect(clampZoom(5, 0.6, 3)).toBe(3);
  });

  it("keeps repeated zoom-in steps from exceeding the maximum", () => {
    let scale = 1;
    for (let i = 0; i < 20; i++) {
      scale = clampZoom(scale * 1.2);
    }
    expect(scale).toBe(ZOOM_MAX);
  });

  it("keeps repeated zoom-out steps from going below the minimum", () => {
    let scale = 1;
    for (let i = 0; i < 20; i++) {
      scale = clampZoom(scale / 1.2);
    }
    expect(scale).toBe(ZOOM_MIN);
  });
});

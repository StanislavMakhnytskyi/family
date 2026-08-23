import { describe, expect, it } from "vitest";
import { initials, lifespan } from "@/lib/utils";

describe("initials", () => {
  it("uses both first and last name when both are present", () => {
    expect(initials("Іван", "Ковальський")).toBe("І.К.");
  });

  it("falls back to just the first initial when lastName is missing", () => {
    expect(initials("Іван", undefined)).toBe("І.");
    expect(initials("Іван", "")).toBe("І.");
  });
});

describe("lifespan", () => {
  it("shows a range when both dates are present", () => {
    expect(lifespan("1928", "1996")).toBe("1928 – 1996");
  });

  it("shows just a birth year when there's no death date", () => {
    expect(lifespan("1928", undefined)).toBe("нар. 1928");
  });

  it("shows just a death year when there's no birth date", () => {
    expect(lifespan(undefined, "1996")).toBe("пом. 1996");
  });

  it("returns an empty string when neither date is present", () => {
    expect(lifespan(undefined, undefined)).toBe("");
  });
});

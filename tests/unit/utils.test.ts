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
  const labels = { born: "нар.", died: "пом." };

  it("shows a range when both dates are present", () => {
    expect(lifespan("1928", "1996", labels)).toBe("1928 – 1996");
  });

  it("shows just a birth year (with the born label) when there's no death date", () => {
    expect(lifespan("1928", undefined, labels)).toBe("нар. 1928");
  });

  it("shows just a death year (with the died label) when there's no birth date", () => {
    expect(lifespan(undefined, "1996", labels)).toBe("пом. 1996");
  });

  it("returns an empty string when neither date is present", () => {
    expect(lifespan(undefined, undefined, labels)).toBe("");
  });

  it("uses whatever labels are passed in, e.g. for a different locale", () => {
    expect(lifespan("1928", undefined, { born: "b.", died: "d." })).toBe("b. 1928");
  });
});

import { describe, expect, it } from "vitest";
import { normalizeAnswer } from "@/lib/utils";

describe("normalizeAnswer", () => {
  it("lowercases and trims whitespace", () => {
    expect(normalizeAnswer("  Полтава  ")).toBe("полтава");
  });

  it("replaces є with е", () => {
    expect(normalizeAnswer("Кутє")).toBe("куте");
  });

  it("replaces ї with і", () => {
    expect(normalizeAnswer("Їжак")).toBe("іжак");
  });

  it("handles combined case, whitespace and letter substitution", () => {
    expect(normalizeAnswer("  Їжачок Європейський  ")).toBe(
      "іжачок европейський",
    );
  });

  it("returns an already-normalized string unchanged", () => {
    expect(normalizeAnswer("рекс")).toBe("рекс");
  });
});

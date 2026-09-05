import { describe, expect, it } from "vitest";
import { isAnswerMatch, normalizeAnswer } from "@/lib/utils";

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

describe("isAnswerMatch", () => {
  it("still requires an exact match for a single-word answer", () => {
    expect(isAnswerMatch("полтава", "полтава")).toBe(true);
    expect(isAnswerMatch("м. полтава", "полтава")).toBe(false);
    expect(isAnswerMatch("полтава ", " Полтава")).toBe(true);
  });

  it("matches a multi-word answer regardless of word order", () => {
    expect(isAnswerMatch("саша вася", "вася и саша")).toBe(true);
  });

  it("tolerates extra words the user adds around the required ones", () => {
    expect(isAnswerMatch("вася и брат саша", "вася и саша")).toBe(true);
  });

  it("ignores connector words like 'и' on both sides", () => {
    expect(isAnswerMatch("вася саша", "вася и саша")).toBe(true);
  });

  it("treats slash- or comma-separated variants the same way", () => {
    expect(isAnswerMatch("сашка василий", "василий / сашка")).toBe(true);
    expect(isAnswerMatch("александр василий", "василий, александр")).toBe(true);
  });

  it("rejects an answer missing one of the required words", () => {
    expect(isAnswerMatch("вася", "вася и саша")).toBe(false);
    expect(isAnswerMatch("", "вася и саша")).toBe(false);
  });

  it("is case- and letter-substitution-insensitive like normalizeAnswer", () => {
    expect(isAnswerMatch("САША ВАСЯ", "Вася И Саша")).toBe(true);
  });
});

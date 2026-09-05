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
    expect(isAnswerMatch("софія тарас", "тарас і софія")).toBe(true);
  });

  it("tolerates extra words the user adds around the required ones", () => {
    expect(isAnswerMatch("тарас і сестра софія", "тарас і софія")).toBe(true);
  });

  it("ignores connector words like 'і' on both sides", () => {
    expect(isAnswerMatch("тарас софія", "тарас і софія")).toBe(true);
  });

  it("treats slash- or comma-separated variants the same way", () => {
    expect(isAnswerMatch("софія тарас", "тарас / софія")).toBe(true);
    expect(isAnswerMatch("софія тарас", "тарас, софія")).toBe(true);
  });

  it("rejects an answer missing one of the required words", () => {
    expect(isAnswerMatch("тарас", "тарас і софія")).toBe(false);
    expect(isAnswerMatch("", "тарас і софія")).toBe(false);
  });

  it("is case- and letter-substitution-insensitive like normalizeAnswer", () => {
    expect(isAnswerMatch("СОФІЯ ТАРАС", "Тарас І Софія")).toBe(true);
  });
});

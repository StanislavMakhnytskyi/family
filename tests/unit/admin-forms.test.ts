import { describe, expect, it } from "vitest";
import {
  bioToTextareaValue,
  textareaValueToBio,
  textValueToVariants,
  variantsToTextValue,
} from "@/lib/admin-forms";

describe("bio <-> textarea", () => {
  it("joins paragraphs with a blank line", () => {
    expect(bioToTextareaValue(["First.", "Second."])).toBe("First.\n\nSecond.");
  });

  it("returns an empty string for undefined bio", () => {
    expect(bioToTextareaValue(undefined)).toBe("");
  });

  it("splits blank-line-separated text back into paragraphs", () => {
    expect(textareaValueToBio("First.\n\nSecond.")).toEqual([
      "First.",
      "Second.",
    ]);
  });

  it("trims paragraphs and drops empty ones", () => {
    expect(textareaValueToBio("  First.  \n\n\n\n  Second.  \n\n")).toEqual([
      "First.",
      "Second.",
    ]);
  });

  it("returns undefined for blank input", () => {
    expect(textareaValueToBio("   \n\n  ")).toBeUndefined();
  });

  it("round-trips through both conversions", () => {
    const original = ["Paragraph one.", "Paragraph two."];
    expect(textareaValueToBio(bioToTextareaValue(original))).toEqual(original);
  });
});

describe("variants <-> comma-separated text", () => {
  it("joins variants with a comma", () => {
    expect(variantsToTextValue(["полтава", "м. полтава"])).toBe(
      "полтава, м. полтава",
    );
  });

  it("splits comma-separated text and trims each item", () => {
    expect(textValueToVariants(" полтава ,  м. полтава ")).toEqual([
      "полтава",
      "м. полтава",
    ]);
  });

  it("drops empty entries from stray commas", () => {
    expect(textValueToVariants("полтава,,  ,м. полтава")).toEqual([
      "полтава",
      "м. полтава",
    ]);
  });

  it("returns undefined for blank input", () => {
    expect(textValueToVariants("  ")).toBeUndefined();
  });
});

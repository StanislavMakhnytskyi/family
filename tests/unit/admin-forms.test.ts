import { describe, expect, it } from "vitest";
import {
  bioToTextareaValue,
  displayValueToIsoDate,
  isoDateToDisplayValue,
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

describe("stored ISO date <-> admin-panel dd.mm.yyyy display", () => {
  it("converts a stored ISO date to dd.mm.yyyy for display", () => {
    expect(isoDateToDisplayValue("1928-05-12")).toBe("12.05.1928");
  });

  it("leaves a bare year unchanged", () => {
    expect(isoDateToDisplayValue("1928")).toBe("1928");
  });

  it("leaves anything else that isn't a full ISO date unchanged", () => {
    expect(isoDateToDisplayValue("")).toBe("");
    expect(isoDateToDisplayValue("12.05.1928")).toBe("12.05.1928");
  });

  it("converts a typed dd.mm.yyyy value back to ISO for storage", () => {
    expect(displayValueToIsoDate("12.05.1928")).toBe("1928-05-12");
  });

  it("leaves a bare year unchanged", () => {
    expect(displayValueToIsoDate("1928")).toBe("1928");
  });

  it("passes through partial/in-progress typing unchanged", () => {
    expect(displayValueToIsoDate("12.05.192")).toBe("12.05.192");
    expect(displayValueToIsoDate("12.0")).toBe("12.0");
  });

  it("round-trips through both conversions", () => {
    expect(isoDateToDisplayValue(displayValueToIsoDate("12.05.1928"))).toBe(
      "12.05.1928",
    );
    expect(displayValueToIsoDate(isoDateToDisplayValue("1928-05-12"))).toBe(
      "1928-05-12",
    );
  });
});

import { describe, expect, it } from "vitest";
import { validateRawData } from "@/lib/admin-data";

const validPeople = [
  { id: "ivan", firstName: "Іван", lastName: "Ковальський", birthDate: "1928" },
  { id: "hanna", firstName: "Ганна", lastName: "Ковальська", birthDate: "1931" },
];

function baseData(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    people: validPeople,
    relationships: [],
    graves: [],
    media: [],
    questions: [
      { id: "q1", question: "?", normalizedAnswer: "рекс" },
    ],
    ...overrides,
  };
}

describe("validateRawData", () => {
  it("accepts well-formed, internally-consistent data", () => {
    const result = validateRawData(
      baseData({
        relationships: [
          { id: "r1", type: "spouse", person1Id: "ivan", person2Id: "hanna" },
        ],
        graves: [{ personId: "ivan", latitude: 49.4, longitude: 28.5 }],
        media: [
          { id: "m1", personId: "hanna", url: "/x.svg", type: "photo" },
        ],
      }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects data that isn't an object", () => {
    const result = validateRawData(null);
    expect(result.success).toBe(false);
  });

  it("rejects a relationship pointing at an unknown person", () => {
    const result = validateRawData(
      baseData({
        relationships: [
          { id: "r1", type: "spouse", person1Id: "ivan", person2Id: "ghost" },
        ],
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.includes("ghost"))).toBe(true);
    }
  });

  it("rejects a grave pointing at an unknown person", () => {
    const result = validateRawData(
      baseData({
        graves: [{ personId: "ghost", latitude: 49.4, longitude: 28.5 }],
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.includes("ghost"))).toBe(true);
    }
  });

  it("rejects a media entry pointing at an unknown person", () => {
    const result = validateRawData(
      baseData({
        media: [{ id: "m1", personId: "ghost", url: "/x.svg", type: "photo" }],
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.includes("ghost"))).toBe(true);
    }
  });

  it("rejects a schema violation (e.g. out-of-range latitude) before checking references", () => {
    const result = validateRawData(
      baseData({
        graves: [{ personId: "ivan", latitude: 999, longitude: 28.5 }],
      }),
    );
    expect(result.success).toBe(false);
  });
});

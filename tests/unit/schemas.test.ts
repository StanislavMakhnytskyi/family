import { describe, expect, it } from "vitest";
import {
  peopleSchema,
  relationshipsSchema,
  gravesSchema,
  mediaListSchema,
  questionsSchema,
} from "@/lib/schemas";

describe("personSchema", () => {
  it("accepts a valid person", () => {
    const result = peopleSchema.safeParse([
      { id: "p1", firstName: "Іван", lastName: "Ковальський", birthDate: "1928" },
    ]);
    expect(result.success).toBe(true);
  });

  it("rejects a person missing required fields", () => {
    const result = peopleSchema.safeParse([{ id: "p1", firstName: "Іван" }]);
    expect(result.success).toBe(false);
  });
});

describe("relationshipSchema", () => {
  it("accepts valid relationship types", () => {
    const result = relationshipsSchema.safeParse([
      { id: "r1", type: "parent-child", person1Id: "p1", person2Id: "p2" },
    ]);
    expect(result.success).toBe(true);
  });

  it("rejects an unknown relationship type", () => {
    const result = relationshipsSchema.safeParse([
      { id: "r1", type: "sibling", person1Id: "p1", person2Id: "p2" },
    ]);
    expect(result.success).toBe(false);
  });
});

describe("graveSchema", () => {
  it("rejects coordinates out of range", () => {
    const result = gravesSchema.safeParse([
      { personId: "p1", latitude: 999, longitude: 28.5 },
    ]);
    expect(result.success).toBe(false);
  });

  it("accepts valid coordinates", () => {
    const result = gravesSchema.safeParse([
      { personId: "p1", latitude: 49.45, longitude: 28.51 },
    ]);
    expect(result.success).toBe(true);
  });
});

describe("mediaSchema", () => {
  it("rejects an invalid media type", () => {
    const result = mediaListSchema.safeParse([
      { id: "m1", personId: "p1", url: "/x.jpg", type: "video" },
    ]);
    expect(result.success).toBe(false);
  });
});

describe("questionSchema", () => {
  it("accepts a question without variants", () => {
    const result = questionsSchema.safeParse([
      { id: "q1", question: "?", normalizedAnswer: "рекс" },
    ]);
    expect(result.success).toBe(true);
  });
});

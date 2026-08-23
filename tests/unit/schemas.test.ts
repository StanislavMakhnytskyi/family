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

  it("rejects a person missing id or firstName", () => {
    expect(peopleSchema.safeParse([{ firstName: "Іван" }]).success).toBe(false);
    expect(peopleSchema.safeParse([{ id: "p1" }]).success).toBe(false);
  });

  it("accepts a person with no lastName or birthDate", () => {
    const result = peopleSchema.safeParse([{ id: "p1", firstName: "Іван" }]);
    expect(result.success).toBe(true);
  });

  it("normalizes a legacy single-URL avatar into {small, large} using the same URL for both", () => {
    const result = peopleSchema.safeParse([
      { id: "p1", firstName: "Іван", avatar: "/api/media/legacy.jpg" },
    ]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].avatar).toEqual({
        small: "/api/media/legacy.jpg",
        large: "/api/media/legacy.jpg",
      });
    }
  });

  it("accepts a {small, large} avatar", () => {
    const result = peopleSchema.safeParse([
      {
        id: "p1",
        firstName: "Іван",
        avatar: { small: "/api/media/s.jpg", large: "/api/media/l.jpg" },
      },
    ]);
    expect(result.success).toBe(true);
  });

  it("rejects an avatar object missing small or large", () => {
    const result = peopleSchema.safeParse([
      { id: "p1", firstName: "Іван", avatar: { small: "/api/media/s.jpg" } },
    ]);
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

  it("normalizes a legacy single personId into personIds", () => {
    const result = mediaListSchema.safeParse([
      { id: "m1", personId: "p1", url: "/x.jpg", type: "photo" },
    ]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].personIds).toEqual(["p1"]);
    }
  });

  it("accepts a media item tagged with several people", () => {
    const result = mediaListSchema.safeParse([
      { id: "m1", personIds: ["p1", "p2"], url: "/x.jpg", type: "photo" },
    ]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].personIds).toEqual(["p1", "p2"]);
    }
  });

  it("rejects a media item with no one tagged", () => {
    const result = mediaListSchema.safeParse([
      { id: "m1", personIds: [], url: "/x.jpg", type: "photo" },
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

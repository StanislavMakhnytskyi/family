import { describe, expect, it } from "vitest";
import { renamePersonId, type FullData } from "@/lib/admin-data";

function baseData(): FullData {
  return {
    people: [
      { id: "ivan", firstName: "Іван", lastName: "Петров", birthDate: "1928" },
      { id: "hanna", firstName: "Ганна", lastName: "Ковальська", birthDate: "1931" },
    ],
    relationships: [
      { id: "r1", type: "spouse", person1Id: "ivan", person2Id: "hanna" },
      { id: "r2", type: "parent-child", person1Id: "hanna", person2Id: "ivan" },
    ],
    graves: [{ personId: "ivan", latitude: 49.4, longitude: 28.5 }],
    media: [{ id: "m1", personIds: ["ivan", "hanna"], url: "/x.svg", type: "photo" }],
    questions: [],
  };
}

describe("renamePersonId", () => {
  it("renames the person's own id", () => {
    const next = renamePersonId(baseData(), "ivan", "ivan-sidorov");
    expect(next.people.find((p) => p.id === "ivan")).toBeUndefined();
    expect(next.people.find((p) => p.id === "ivan-sidorov")?.firstName).toBe("Іван");
  });

  it("cascades the rename into relationships on both sides", () => {
    const next = renamePersonId(baseData(), "ivan", "ivan-sidorov");
    expect(next.relationships[0]).toMatchObject({ person1Id: "ivan-sidorov", person2Id: "hanna" });
    expect(next.relationships[1]).toMatchObject({ person1Id: "hanna", person2Id: "ivan-sidorov" });
  });

  it("cascades the rename into graves and media, leaving other tagged people untouched", () => {
    const next = renamePersonId(baseData(), "ivan", "ivan-sidorov");
    expect(next.graves[0].personId).toBe("ivan-sidorov");
    expect(next.media[0].personIds).toEqual(["ivan-sidorov", "hanna"]);
  });

  it("leaves references to other people untouched", () => {
    const next = renamePersonId(baseData(), "ivan", "ivan-sidorov");
    expect(next.people.find((p) => p.id === "hanna")).toBeDefined();
  });

  it("is a no-op when the id doesn't actually change", () => {
    const data = baseData();
    expect(renamePersonId(data, "ivan", "ivan")).toEqual(data);
  });
});

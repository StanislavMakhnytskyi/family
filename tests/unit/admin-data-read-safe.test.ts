// Regression test for the follow-up to the readData()-crashes-a-save-action
// bug: the five admin list pages are what a save action's redirect() lands
// on, and Next renders that redirect target's RSC payload as part of the
// *same* Server Action response -- so even after guarding readData() inside
// the save actions themselves, an uncaught throw from the destination list
// page's own readData() call still failed the whole POST with a 500 instead
// of cleanly hitting error.tsx. readDataSafe() must never throw.
import { beforeEach, describe, expect, it, vi } from "vitest";

const readLocalDataMock = vi.fn();

vi.mock("@/lib/data", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/data")>();
  return {
    ...actual,
    readLocalData: (...args: unknown[]) => readLocalDataMock(...args),
  };
});

beforeEach(() => {
  readLocalDataMock.mockReset();
});

function validRawData() {
  return {
    people: [{ id: "a", firstName: "A" }],
    relationships: [],
    graves: [],
    media: [],
    questions: [],
  };
}

describe("readDataSafe", () => {
  it("returns the data on success", async () => {
    readLocalDataMock.mockResolvedValue(validRawData());
    const { readDataSafe } = await import("@/lib/admin-data");
    const result = await readDataSafe("local");
    expect(result).toEqual({ success: true, data: validRawData() });
  });

  it("returns a typed error instead of throwing when the underlying read rejects", async () => {
    readLocalDataMock.mockRejectedValue(new Error("disk on fire"));
    const { readDataSafe } = await import("@/lib/admin-data");
    await expect(readDataSafe("local")).resolves.toEqual({
      success: false,
      error: "disk on fire",
    });
  });

  it("returns a typed error instead of throwing when the data fails validation", async () => {
    readLocalDataMock.mockResolvedValue({
      ...validRawData(),
      relationships: [
        { id: "r1", type: "spouse", person1Id: "a", person2Id: "missing" },
      ],
    });
    const { readDataSafe } = await import("@/lib/admin-data");
    const result = await readDataSafe("local");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("missing");
    }
  });
});

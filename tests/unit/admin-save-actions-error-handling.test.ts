// Regression test for the bug reported as "Не вдалося завантажити дані" /
// minified React error #441 when saving a media item (or any other admin
// collection): every save*() action read the current data with an
// unguarded `await readData(source)` before its already-try/catch-guarded
// writeData() call. If readData() ever throws -- e.g. the stored data
// fails validation for a reason unrelated to what's being saved right now
// -- that exception escaped the Server Action uncaught, which Next.js
// surfaces as a digest-only production error caught by the nearest
// error.tsx, instead of the typed `{error}` state AGENTS.md's own
// convention calls for ("Server Actions return a typed state object...
// not thrown exceptions surfaced as Next error pages"). Each save action
// must instead return a friendly error, exactly like it already does for
// a writeData() failure.
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSelectedDataSourceMock = vi.fn();
const readDataMock = vi.fn();
const writeDataMock = vi.fn();

vi.mock("@/lib/admin-data", () => ({
  getSelectedDataSource: (...args: unknown[]) => getSelectedDataSourceMock(...args),
  readData: (...args: unknown[]) => readDataMock(...args),
  writeData: (...args: unknown[]) => writeDataMock(...args),
  findPersonReferences: vi.fn(() => []),
  renamePersonId: vi.fn((data: unknown) => data),
}));

vi.mock("next/navigation", () => ({
  // A successful save redirects -- if any of these tests reach that path,
  // the mock data source is broken (readData always rejects below), so
  // failing loudly here would mean the fix regressed, not that redirect
  // is genuinely expected.
  redirect: vi.fn(() => {
    throw new Error("redirect() should not be reached on the readData() failure path");
  }),
}));

const READ_ERROR_MESSAGE = "Збережені дані не пройшли валідацію: boom";

beforeEach(() => {
  vi.resetModules();
  getSelectedDataSourceMock.mockReset().mockResolvedValue("local");
  readDataMock.mockReset().mockRejectedValue(new Error(READ_ERROR_MESSAGE));
  writeDataMock.mockReset();
});

describe("admin save actions surface a readData() failure as a typed error", () => {
  it("saveMedia", async () => {
    const { saveMedia } = await import("@/app/admin/(dashboard)/media/actions");
    const formData = new FormData();
    formData.set("mode", "new");
    formData.append("personIds", "someone");
    formData.set("type", "photo");
    await expect(saveMedia({}, formData)).resolves.toEqual({
      error: READ_ERROR_MESSAGE,
    });
  });

  it("savePerson", async () => {
    const { savePerson } = await import("@/app/admin/(dashboard)/people/actions");
    const formData = new FormData();
    formData.set("mode", "new");
    formData.set("id", "someone");
    formData.set("firstName", "Хтось");
    await expect(savePerson({}, formData)).resolves.toEqual({
      error: READ_ERROR_MESSAGE,
    });
  });

  it("saveGrave", async () => {
    const { saveGrave } = await import("@/app/admin/(dashboard)/graves/actions");
    const formData = new FormData();
    formData.set("mode", "new");
    formData.set("personId", "someone");
    formData.set("latitude", "49.4");
    formData.set("longitude", "28.5");
    await expect(saveGrave({}, formData)).resolves.toEqual({
      error: READ_ERROR_MESSAGE,
    });
  });

  it("saveRelationship", async () => {
    const { saveRelationship } = await import(
      "@/app/admin/(dashboard)/relationships/actions"
    );
    const formData = new FormData();
    formData.set("mode", "new");
    formData.set("type", "spouse");
    formData.set("person1Id", "someone");
    formData.set("person2Id", "someone-else");
    await expect(saveRelationship({}, formData)).resolves.toEqual({
      error: READ_ERROR_MESSAGE,
    });
  });

  it("saveQuestion", async () => {
    const { saveQuestion } = await import("@/app/admin/(dashboard)/questions/actions");
    const formData = new FormData();
    formData.set("mode", "new");
    formData.set("question", "?");
    formData.set("normalizedAnswer", "answer");
    await expect(saveQuestion({}, formData)).resolves.toEqual({
      error: READ_ERROR_MESSAGE,
    });
  });
});

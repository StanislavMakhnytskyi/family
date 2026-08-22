import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/admin-password";

describe("admin password hashing", () => {
  it("verifies a correct password against its own hash", () => {
    const hash = hashPassword("correct horse battery staple");
    expect(verifyPassword("correct horse battery staple", hash)).toBe(true);
  });

  it("rejects an incorrect password", () => {
    const hash = hashPassword("correct horse battery staple");
    expect(verifyPassword("wrong password", hash)).toBe(false);
  });

  it("produces a different salt (and hash) each time", () => {
    const first = hashPassword("same password");
    const second = hashPassword("same password");
    expect(first).not.toBe(second);
    expect(verifyPassword("same password", first)).toBe(true);
    expect(verifyPassword("same password", second)).toBe(true);
  });

  it("rejects malformed stored hashes instead of throwing", () => {
    expect(verifyPassword("anything", "not-a-valid-hash")).toBe(false);
    expect(verifyPassword("anything", "scrypt:onlytwoparts")).toBe(false);
    expect(verifyPassword("anything", "wrongscheme:abc:def")).toBe(false);
  });
});

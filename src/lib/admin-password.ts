import "server-only";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

// Separated with ":" rather than "$" — Next's env loader (dotenv-expand)
// runs on all of process.env and silently truncates values at an unescaped
// "$" by treating what follows as a variable reference to expand.
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hashHex] = parts;

  let storedHash: Buffer;
  try {
    storedHash = Buffer.from(hashHex, "hex");
  } catch {
    return false;
  }

  const candidateHash = scryptSync(password, salt, KEY_LENGTH);
  if (candidateHash.length !== storedHash.length) return false;
  return timingSafeEqual(candidateHash, storedHash);
}

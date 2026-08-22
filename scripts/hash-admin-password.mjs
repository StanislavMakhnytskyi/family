#!/usr/bin/env node
// Generates the ADMIN_PASSWORD_HASH value for a chosen plaintext password.
// Usage: node scripts/hash-admin-password.mjs "your password here"
import { scryptSync, randomBytes } from "node:crypto";

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/hash-admin-password.mjs "your password"');
  process.exitCode = 1;
} else {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  const value = `scrypt:${salt}:${hash}`;
  console.log(`\nSet in the Vercel dashboard and in .env.local:`);
  console.log(`  ADMIN_PASSWORD_HASH=${value}`);
  console.log(`\nSet ADMIN_USERNAME too, in both places.`);
}

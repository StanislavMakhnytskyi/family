// Test-only admin credentials, injected into the Playwright webServer's env
// (see playwright.config.ts) so admin.spec.ts can log in without touching
// real ADMIN_USERNAME/ADMIN_PASSWORD_HASH values.
export const TEST_ADMIN_USERNAME = "e2e-admin";
export const TEST_ADMIN_PASSWORD = "e2e-test-password-123";
export const TEST_ADMIN_PASSWORD_HASH =
  "scrypt:db1fbc1c2a563dbdadaad9f2de5f6077:f2fdab5d54a68cf3d00816aaf8192692d89be05215e1b6089c7eead5e5972db050705975d8a0ecf46ff6c048b3bc9cd1e3eedc9c536c87d61805000ee65a81e2";

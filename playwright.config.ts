import { defineConfig, devices } from "@playwright/test";
import {
  TEST_ADMIN_USERNAME,
  TEST_ADMIN_PASSWORD_HASH,
} from "./tests/e2e/admin-test-credentials";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Tests against a production server (not `next dev`), since dev-mode
    // React StrictMode double-invokes effects and can flake timing-sensitive
    // interactions (e.g. clicking a tree card right after mount).
    command: "pnpm start",
    url: "http://localhost:3000/gate",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      ADMIN_USERNAME: TEST_ADMIN_USERNAME,
      ADMIN_PASSWORD_HASH: TEST_ADMIN_PASSWORD_HASH,
    },
  },
});

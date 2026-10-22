import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45000,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    channel: "msedge",
    baseURL: process.env.SECUREDOCS_E2E_BASE_URL ?? "http://127.0.0.1:3107",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});

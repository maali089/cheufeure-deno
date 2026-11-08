import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "tests",
  testIgnore: ["**/visual/**"],
  globalSetup: "./tests/global-setup.ts",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL, trace: "retain-on-failure", locale: "de-DE", timezoneId: "Europe/Berlin" },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "node node_modules/next/dist/bin/next start --port 3000", url: baseURL, reuseExistingServer: true, timeout: 120_000 },
  projects: [
    { name: "unit", testMatch: /unit\/.*\.spec\.ts/ },
    { name: "desktop", testMatch: /e2e\/.*\.spec\.ts/, use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", testMatch: /e2e\/(home|mobile|dialog|story)\.spec\.ts/, use: { ...devices["Pixel 7"] } },
  ],
});

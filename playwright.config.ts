import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
// Set E2E_BASE_URL to test a deployed site instead of starting a local server.
const BASE_URL = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL ?? `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "tablet-portrait", use: { browserName: "chromium", viewport: { width: 768, height: 1024 }, hasTouch: true } },
    { name: "tablet-landscape", use: { browserName: "chromium", viewport: { width: 1024, height: 768 }, hasTouch: true } },
    { name: "phone", use: { browserName: "chromium", viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
  ],
  webServer: BASE_URL
    ? undefined
    : {
        command: `pnpm dev --port ${PORT}`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  retries: 0,
  reporter: "line",

  use: {
    baseURL: "http://localhost:3000",
    actionTimeout: 10_000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    // CI: build once then serve the production bundle (faster, more stable).
    // Locally: reuse the already-running dev server if one is up.
    command: process.env.CI ? "npm run build && npm start" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000, // prod builds can take a while
  },
});

const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: "html",
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: [
    {
      command: "npm run start:e2e",
      url: "http://127.0.0.1:3100",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});

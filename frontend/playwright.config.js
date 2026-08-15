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

  // The backend must be listening on 8100 before the frontend is useful: the app and
  // the spec both talk to http://127.0.0.1:8100. Playwright starts them in order and
  // waits for each url to answer.
  webServer: [
    {
      command: "npm start",
      cwd: "../backend",
      url: "http://127.0.0.1:8100/api/v1/health",
      // Set here rather than in a backend script so the backend needs no extra
      // dependency, and because this is applied identically on every platform.
      // dotenv does not override already-set variables, so these win over backend/.env.
      // NODE_ENV=development is what puts 127.0.0.1:3100 in the allowed CORS origins.
      env: {
        PORT: "8100",
        NODE_ENV: "development",
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "npm run start:e2e",
      url: "http://127.0.0.1:3100",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});

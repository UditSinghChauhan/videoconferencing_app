const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/e2e",
  timeout: 180000,
  expect: {
    timeout: 15000
  },
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    headless: true,
    channel: "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: [
    {
      command: "cmd /c \"set PORT=8100&& node src/app.js\"",
      cwd: "../backend",
      url: "http://127.0.0.1:8100/api/v1/health",
      reuseExistingServer: false,
      timeout: 120000
    },
    {
      command: "npm.cmd run start:e2e",
      cwd: ".",
      url: "http://127.0.0.1:3100",
      reuseExistingServer: false,
      timeout: 120000
    }
  ]
});

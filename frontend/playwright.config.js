import { defineConfig, devices } from "@playwright/test";

const API_PORT = 8100;
const WEB_PORT = 3100;

export default defineConfig({
    testDir: "./tests/e2e",
    fullyParallel: false,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
    timeout: 90_000,
    expect: { timeout: 15_000 },
    use: {
        baseURL: `http://127.0.0.1:${WEB_PORT}`,
        trace: "retain-on-failure",
        permissions: ["camera", "microphone"],
        launchOptions: {
            // Real (synthetic) camera and mic, so WebRTC runs end to end.
            args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
            executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined
        }
    },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
    webServer: [
        {
            command: "npm start",
            cwd: "../backend",
            url: `http://127.0.0.1:${API_PORT}/api/v1/health`,
            env: {
                PORT: String(API_PORT),
                NODE_ENV: "development",
                MONGODB_URI: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/bridge-e2e",
                JWT_SECRET: process.env.JWT_SECRET || "e2e-access-secret",
                JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "e2e-refresh-secret",
                LOG_LEVEL: "warn",
                AUTH_RATE_LIMIT_MAX: "1000"
            },
            reuseExistingServer: !process.env.CI,
            timeout: 120_000
        },
        {
            command: "npm run start:e2e",
            url: `http://127.0.0.1:${WEB_PORT}`,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000
        }
    ]
});

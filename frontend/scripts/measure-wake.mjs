// Measures click-to-usable-room times for the two ways into Bridge from the
// landing page: the no-account demo, and sign-up -> new meeting -> live room.
// Usage: node scripts/measure-wake.mjs [baseUrl]   (default http://127.0.0.1:5173)
// Against production, only the demo path runs (it creates no data):
//   node scripts/measure-wake.mjs https://bridgefrontend.onrender.com --demo-only
import { chromium } from "@playwright/test";

const base = process.argv[2] || "http://127.0.0.1:5173";
const demoOnly = process.argv.includes("--demo-only");
const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"]
});
const seconds = (ms) => `${(ms / 1000).toFixed(2)} s`;

async function demo() {
    const page = await (await browser.newContext({ permissions: ["camera", "microphone"] })).newPage();
    await page.goto(base, { waitUntil: "networkidle" });
    const start = Date.now();
    await page.getByRole("link", { name: "Try the live demo" }).first().click();
    await page.getByTestId("join-meeting-button").waitFor();
    const lobby = Date.now() - start;
    await page.getByTestId("join-meeting-button").click();
    await page.getByTestId("video-tile").nth(3).waitFor();
    console.log(`Demo: click -> lobby ${seconds(lobby)}, click -> usable room (4 tiles) ${seconds(Date.now() - start)}`);
    await page.context().close();
}

async function realRoom() {
    const page = await (await browser.newContext({ permissions: ["camera", "microphone"] })).newPage();
    await page.goto(base, { waitUntil: "networkidle" });
    const start = Date.now();
    await page.getByRole("link", { name: "Start a meeting" }).click();
    await page.getByLabel("Your name").fill("Timing Check");
    await page.getByLabel("Username").fill(`timing_${Date.now().toString(36)}`);
    await page.getByLabel("Password", { exact: true }).fill("Passw0rd!");
    const typed = Date.now();
    await page.getByRole("button", { name: "Create account" }).click();
    await page.getByTestId("new-meeting-button").click();
    await page.getByTestId("join-meeting-button").click();
    await page.getByTestId("video-tile").first().waitFor();
    const typing = typed - start;
    console.log(`Real room: click -> usable room ${seconds(Date.now() - start)} (of which ${seconds(typing)} is the script filling the form)`);

    await page.getByRole("button", { name: /^Chat/ }).click();
    await page.getByLabel("Message everyone").fill("Next step: ship the release Thursday, I will follow up with QA.");
    await page.keyboard.press("Enter");
    await page.getByTestId("chat-log").getByText("ship the release").waitFor();
    await page.getByTestId("leave-button").click();
    const ending = Date.now();
    await page.getByTestId("confirm-end-meeting").click();
    await page.getByRole("heading", { name: "Key points" }).waitFor();
    console.log(`Recap: confirm End -> key points on screen ${seconds(Date.now() - ending)}`);
    await page.context().close();
}

await demo();
if (!demoOnly) await realRoom();
await browser.close();

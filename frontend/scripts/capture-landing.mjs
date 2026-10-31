// Captures the landing page's product images and hero recording from the
// running app, so marketing visuals never drift from the product.
//
// Needs the API and web app running against a scratch database, e.g.:
//   cd backend && npm run db:memory
//   cd backend && PORT=8100 MONGODB_URI=mongodb://127.0.0.1:27017/bridge-capture \
//     JWT_SECRET=dev JWT_REFRESH_SECRET=dev AUTH_RATE_LIMIT_MAX=1000 npm start
//   cd frontend && npm run start:e2e
// Then: node scripts/capture-landing.mjs   (needs ffmpeg on PATH)
//
// Output: public/landing/*.webp (stills at 2x), hero.mp4 / hero.webm (20 s loop), hero-poster.webp
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const BASE = process.env.CAPTURE_BASE_URL || "http://127.0.0.1:3100";
const OUT = new URL("../public/landing/", import.meta.url).pathname;
const PASSWORD = "Passw0rd!";
const DESKTOP = { width: 1280, height: 800 };
const MOBILE = { width: 390, height: 844 };

const PEOPLE = {
    host: "Maya Patel",
    aarav: "Aarav Mehta",
    sofia: "Sofia Rossi",
    jordan: "Jordan Lee"
};

// A short stand-up with real decisions, so the recap has something to say.
const CHAT = [
    ["host", "Agenda: release checklist first, then the onboarding bug."],
    ["aarav", "The onboarding fix is in review and should merge before lunch."],
    ["sofia", "Design signed off on the empty states. I'll follow up with the copy today."],
    ["jordan", "Next step: we ship the release Thursday, and that deadline is firm."],
    ["host", "Decision: Aarav owns the fix, Sofia owns the copy, I'll update the release plan."]
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const uid = () => Math.random().toString(36).slice(2, 7);

const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
    // Autoplay without a gesture so the speaking detector's AudioContext runs.
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"]
});

async function person(key, { viewport = { width: 1024, height: 700 }, scale = 1 } = {}) {
    const context = await browser.newContext({
        viewport,
        deviceScaleFactor: scale,
        permissions: ["camera", "microphone", "clipboard-read", "clipboard-write"],
        reducedMotion: "no-preference",
        colorScheme: "light"
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => console.error(`[${key}] ${error.message}`));
    const name = PEOPLE[key];

    await page.goto(`${BASE}/auth?mode=signup`);
    await page.getByLabel("Your name").fill(name);
    await page.getByLabel("Username").fill(`${name.split(" ")[0].toLowerCase()}_${uid()}`);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL(/\/home$/);
    return { key, name, context, page };
}

async function enterRoom(p, { micOff = false } = {}) {
    await p.page.getByTestId("join-meeting-button").waitFor();
    // Cameras off: the fake device's test pattern is not a face. Wait for the
    // device to start first, or the click lands before the toggle exists.
    await p.page.getByRole("button", { name: "Turn off camera" }).click({ timeout: 10_000 });
    await p.page.getByRole("button", { name: "Turn on camera" }).waitFor();
    if (micOff) {
        await p.page.getByRole("button", { name: "Turn off microphone" }).click({ timeout: 10_000 });
    }
    await p.page.getByTestId("join-meeting-button").click();
    await p.page.getByTestId("video-tile").first().waitFor();
}

async function joinRoom(p, meetingId, options) {
    await p.page.goto(`${BASE}/room/${meetingId}`);
    await enterRoom(p, options);
}

async function openChat(p) {
    const input = p.page.getByLabel("Message everyone");
    if (!(await input.isVisible().catch(() => false))) {
        await p.page.getByRole("button", { name: /^Chat/ }).click();
        await input.waitFor();
    }
    return input;
}

async function say(p, text) {
    const input = await openChat(p);
    await input.fill(text);
    await input.press("Enter");
}

async function startMeeting(host) {
    await host.page.getByTestId("new-meeting-button").click();
    await host.page.waitForURL(/\/room\//);
    const meetingId = host.page.url().split("/room/")[1];
    await enterRoom(host);
    return meetingId;
}

async function endMeeting(host) {
    await host.page.getByTestId("leave-button").click();
    await host.page.getByTestId("confirm-end-meeting").click();
    await host.page.getByRole("heading", { name: "Meeting recap" }).waitFor();
}

/** Drop hover tooltips and focus rings so a still shows the resting UI. */
async function settle(page) {
    await page.mouse.move(2, 400);
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
    await sleep(300);
}

/** Resolves once any tile shows the speaking ring (the fake mic beeps periodically). */
const waitForSpeaking = (page) =>
    page.waitForFunction(() =>
        [...document.querySelectorAll('[data-testid="video-tile"]')].some((tile) => /speaking/.test(tile.className)),
    null, { timeout: 20_000, polling: 50 });

const shot = (page, name, options = {}) =>
    page.screenshot({ path: join(OUT, `${name}.png`), animations: "disabled", caret: "hide", ...options });

/** PNG to WebP, then drop the PNG. */
async function toWebp() {
    for (const file of await readdir(OUT)) {
        if (!file.endsWith(".png")) continue;
        const source = join(OUT, file);
        execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", source, "-c:v", "libwebp", "-quality", "82", source.replace(/\.png$/, ".webp")]);
        await rm(source);
    }
}

async function captureStills() {
    const host = await person("host", { viewport: DESKTOP, scale: 2 });
    const meetingId = await startMeeting(host);

    // 1. Start: the host alone, invite link copied.
    await host.page.getByRole("button", { name: /Copy invite/ }).click();
    await host.page.getByText("Copied").waitFor();
    await settle(host.page);
    await shot(host.page, "step-start-desktop");

    // The mobile still comes from a room opened on a phone-sized screen.
    const phoneHost = await person("host", { viewport: MOBILE, scale: 2 });
    await startMeeting(phoneHost);
    await phoneHost.page.getByRole("button", { name: /Copy invite/ }).click();
    await settle(phoneHost.page);
    await shot(phoneHost.page, "step-start-mobile");
    await phoneHost.context.close();

    // 2. Share: three people join and talk.
    const aarav = await person("aarav");
    const sofia = await person("sofia", { viewport: MOBILE, scale: 2 });
    const jordan = await person("jordan");
    await joinRoom(aarav, meetingId);
    await joinRoom(sofia, meetingId);
    await joinRoom(jordan, meetingId, { micOff: true });
    await host.page.getByTestId("video-tile").nth(3).waitFor();

    const speakers = { host, aarav, sofia, jordan };
    for (const [key, text] of CHAT.slice(0, 4)) {
        await say(speakers[key], text);
        await sleep(300);
    }
    await openChat(host);
    await host.page.getByTestId("chat-log").getByText("deadline is firm").waitFor();
    await settle(host.page);
    await waitForSpeaking(host.page);
    await shot(host.page, "step-share-desktop");
    await sofia.page.getByRole("button", { name: "Close chat" }).click();
    await sofia.page.getByTestId("video-tile").nth(3).waitFor();
    await settle(sofia.page);
    await waitForSpeaking(sofia.page);
    await shot(sofia.page, "step-share-mobile");

    await say(host, CHAT[4][1]);
    await sleep(500);

    // 3. Recap: the host ends the call.
    await endMeeting(host);
    await host.page.locator("details summary").click();
    await host.page.evaluate(() => window.scrollTo(0, 0));
    await settle(host.page);
    await shot(host.page, "step-recap-desktop", { fullPage: true });
    await sofia.page.getByRole("heading", { name: "Meeting recap" }).waitFor({ timeout: 15_000 }).catch(async () => {
        await sofia.page.goto(`${BASE}/meetings/${meetingId}`);
        await sofia.page.getByRole("heading", { name: "Meeting recap" }).waitFor();
    });
    await sofia.page.locator("details summary").click();
    await sofia.page.evaluate(() => window.scrollTo(0, 0));
    await settle(sofia.page);
    await shot(sofia.page, "step-recap-mobile", { fullPage: true });

    for (const p of [host, aarav, sofia, jordan]) await p.context.close();
}

/**
 * Records the page with Chrome's screencast (frames arrive only when pixels
 * change, each with a timestamp) and returns a stop function.
 */
async function startScreencast(page, dir) {
    const cdp = await page.context().newCDPSession(page);
    const frames = [];
    cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
        const file = join(dir, `frame-${String(frames.length).padStart(5, "0")}.jpg`);
        frames.push({ file, at: metadata.timestamp });
        await writeFile(file, Buffer.from(data, "base64"));
        await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
    });
    await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: DESKTOP.width, maxHeight: DESKTOP.height, everyNthFrame: 1 });

    return async () => {
        await cdp.send("Page.stopScreencast");
        return frames;
    };
}

/** Variable-rate frames to a constant 30 fps clip of exactly `seconds`. */
async function encode(frames, dir, seconds) {
    const start = frames[0].at;
    const lines = ["ffconcat version 1.0"];
    frames.forEach((frame, index) => {
        const next = frames[index + 1]?.at ?? start + seconds;
        lines.push(`file '${frame.file}'`, `duration ${Math.max(next - frame.at, 0.001).toFixed(3)}`);
    });
    lines.push(`file '${frames.at(-1).file}'`);
    const list = join(dir, "frames.txt");
    await writeFile(list, lines.join("\n"));

    const input = ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-t", String(seconds), "-an",
        // Short fades either side of the loop point, so the recap does not cut hard back to the room.
        "-vf", `scale=${DESKTOP.width}:${DESKTOP.height}:flags=lanczos,fps=30,fade=t=in:st=0:d=0.4,fade=t=out:st=${seconds - 0.5}:d=0.5`];
    execFileSync("ffmpeg", [...input, "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-pix_fmt", "yuv420p", "-movflags", "+faststart", join(OUT, "hero.mp4")]);
    execFileSync("ffmpeg", [...input, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "36", "-row-mt", "1", join(OUT, "hero.webm")]);
}

async function captureRecording() {
    const dir = await mkdtemp(join(tmpdir(), "bridge-hero-"));
    const host = await person("host", { viewport: DESKTOP });
    const meetingId = await startMeeting(host);
    const aarav = await person("aarav");
    const sofia = await person("sofia");
    const jordan = await person("jordan");
    await joinRoom(aarav, meetingId);
    await joinRoom(sofia, meetingId);
    await joinRoom(jordan, meetingId, { micOff: true });
    await host.page.getByTestId("video-tile").nth(3).waitFor().catch(async (error) => {
        await host.page.screenshot({ path: join(dir, "debug.png") });
        console.error(`Host sees ${await host.page.getByTestId("video-tile").count()} tiles; see ${dir}/debug.png`);
        throw error;
    });
    await openChat(host);
    await settle(host.page);

    // The call is already under way when the clip starts, so the recap carries
    // the 20 s: two last messages (~3 s), the host ends the call (~3 s), then
    // the recap holds, scrolls to the transcript and holds again (~14 s).
    const speakers = { host, aarav, sofia, jordan };
    for (const [key, text] of CHAT.slice(0, 3)) {
        await say(speakers[key], text);
        await sleep(300);
    }
    await settle(host.page);
    await sleep(1000);

    const stop = await startScreencast(host.page, dir);
    await sleep(600);
    for (const [key, text] of CHAT.slice(3)) {
        await say(speakers[key], text);
        if (key === "host") await settle(host.page);
        await sleep(1400);
    }
    await host.page.getByTestId("leave-button").hover();
    await sleep(400);
    await host.page.getByTestId("leave-button").click();
    await sleep(1100);
    await host.page.getByTestId("confirm-end-meeting").click();
    await host.page.getByRole("heading", { name: "Meeting recap" }).waitFor();
    await host.page.locator("details summary").click();
    await host.page.evaluate(() => window.scrollTo(0, 0));
    await settle(host.page);
    await sleep(4500);
    // Scroll in small steps: the screencast drops frames during native smooth scroll.
    const distance = await host.page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    for (let step = 1; step <= 70; step += 1) {
        const eased = 1 - (1 - step / 70) ** 3;
        await host.page.evaluate((top) => window.scrollTo(0, top), Math.round(distance * eased));
        await sleep(50);
    }
    await sleep(4000);
    const frames = await stop();

    for (const p of [host, aarav, sofia, jordan]) await p.context.close();
    console.log(`Recorded ${frames.length} frames over ${(frames.at(-1).at - frames[0].at).toFixed(1)} s`);
    await encode(frames, dir, 20);
    await rm(dir, { recursive: true, force: true });
}

// CAPTURE_ONLY=stills|recording runs one half, e.g. to redo the clip.
const only = process.env.CAPTURE_ONLY;
await mkdir(OUT, { recursive: true });
if (only !== "recording") await captureStills();
if (only !== "stills") await captureRecording();
await toWebp();
// Poster and reduced-motion still: the top of the finished recap at 2x.
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", join(OUT, "step-recap-desktop.webp"),
    "-vf", `crop=${DESKTOP.width * 2}:${DESKTOP.height * 2}:0:0`, "-c:v", "libwebp", "-quality", "82", join(OUT, "hero-poster.webp")]);
await browser.close();
console.log(`Captures written to ${OUT}`);

// Captures the landing page's product images and hero recordings from the
// running app, so marketing visuals never drift from the product.
//
// Faces: each participant is a separate Chromium whose fake camera and
// microphone play that person's illustrated cast clip (capture/cast/<id>.y4m
// and .wav, made by scripts/render-cast.mjs). Cameras stay on, and Bridge's own
// speaking detector moves the ring because each WAV carries a voice while that
// person talks.
//
// Needs the API and web app running against a scratch database, e.g.:
//   cd backend && npm run db:memory
//   cd backend && PORT=8100 MONGODB_URI=mongodb://127.0.0.1:27017/bridge-capture \
//     JWT_SECRET=dev JWT_REFRESH_SECRET=dev AUTH_RATE_LIMIT_MAX=1000 npm start
//   cd frontend && npm run start:e2e
//   node scripts/render-cast.mjs
// Then: node scripts/capture-landing.mjs   (needs ffmpeg on PATH)
//
// Output in public/landing/: step stills (*.webp, 2x), hero.mp4 / hero.webm
// (desktop loop, 1920 × 1200) with hero-poster.webp, and hero-phone.mp4 /
// hero-phone.webm (portrait loop) with hero-phone-poster.webp.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const BASE = process.env.CAPTURE_BASE_URL || "http://127.0.0.1:3100";
const OUT = new URL("../public/landing/", import.meta.url).pathname;
const PASSWORD = "Passw0rd!";
const CAST_DIR = new URL("../../capture/cast/", import.meta.url).pathname;
const DESKTOP = { width: 1280, height: 800 };
const MOBILE = { width: 390, height: 844 };
// The hero loop renders a 1120 × 700 room at 1920 × 1200: product text lands near
// its real size in a 1200 px frame, instead of shrinking.
const HERO = { viewport: { width: 1120, height: 700 }, scale: 1920 / 1120, out: { width: 1920, height: 1200 }, name: "hero" };
const PHONE = { viewport: { width: 390, height: 780 }, scale: 2, out: { width: 720, height: 1440 }, name: "hero-phone", phone: true };
/** The cast loop length (cast/timeline.ts); participants join on its beat so they take turns speaking. */
const CAST_LOOP_MS = 12_000;

const PEOPLE = {
    host: "Maya Patel",
    aarav: "Aarav Mehta",
    sofia: "Sofia Rossi",
    jordan: "Jordan Lee"
};
/** Which cast clip plays as each participant's camera and microphone. */
const CAST_FOR = { host: "maya", aarav: "aarav", sofia: "sofia", jordan: "jordan" };

const missing = Object.values(CAST_FOR).flatMap((id) => [`${id}.y4m`, `${id}.wav`]).filter((file) => !existsSync(join(CAST_DIR, file)));
if (missing.length) {
    console.error(`Missing cast clips in ${CAST_DIR}: ${missing.join(", ")}.\nRun "node scripts/render-cast.mjs" first (with "npm run start:e2e" running). Cameras are never turned off as a fallback.`);
    process.exit(1);
}

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

const browsers = [];

/** One Chromium per participant: fake devices are per browser, so each person gets their own face and voice. */
async function launchFor(key) {
    const id = CAST_FOR[key];
    const browser = await chromium.launch({
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
        args: [
            "--use-fake-ui-for-media-stream",
            "--use-fake-device-for-media-stream",
            `--use-file-for-fake-video-capture=${join(CAST_DIR, `${id}.y4m`)}`,
            `--use-file-for-fake-audio-capture=${join(CAST_DIR, `${id}.wav`)}`,
            // Autoplay without a gesture so the speaking detector's AudioContext runs.
            "--autoplay-policy=no-user-gesture-required"
        ]
    });
    browsers.push(browser);
    return browser;
}

/** Guests only need a small window: the captures are taken from the host's view. */
async function person(key, { viewport = { width: 720, height: 480 }, scale = 1 } = {}) {
    const browser = await launchFor(key);
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
    return { key, name, context, page, browser };
}

/** Closes a participant and their browser. */
async function done(p) {
    await p.context.close();
    await p.browser.close();
}

async function enterRoom(p) {
    await p.page.getByTestId("join-meeting-button").waitFor();
    // Cameras on: the camera is this person's cast clip. Wait for it to be live.
    await p.page.getByRole("button", { name: "Turn off camera" }).waitFor({ timeout: 10_000 });
    await p.page.getByTestId("join-meeting-button").click();
    await p.page.getByTestId("video-tile").first().waitFor();
}

/**
 * Opens the room on the cast loop's beat relative to the host, so everyone's
 * clip is in phase and people speak in turn instead of over each other.
 */
async function onBeat(since) {
    const wait = (CAST_LOOP_MS - ((Date.now() - since) % CAST_LOOP_MS)) % CAST_LOOP_MS;
    await sleep(wait);
}

async function joinRoom(p, meetingId, beat) {
    if (beat) await onBeat(beat);
    await p.page.goto(`${BASE}/room/${meetingId}`);
    await enterRoom(p);
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

/** Starts a meeting; returns its code and when the host's camera clip started (the beat). */
async function startMeeting(host) {
    await host.page.getByTestId("new-meeting-button").click();
    await host.page.waitForURL(/\/room\//);
    const beat = Date.now();
    const meetingId = host.page.url().split("/room/")[1];
    await enterRoom(host);
    return { meetingId, beat };
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

/** Resolves when `name` starts speaking: their ring is off, then on. */
async function waitForTurn(page, name) {
    const speaking = () => page.evaluate((who) => [...document.querySelectorAll('[data-testid="video-tile"]')]
        .some((tile) => /speaking/.test(tile.className) && tile.querySelector('[data-testid="participant-label"]')?.textContent?.startsWith(who)), name);
    const deadline = Date.now() + 30_000;
    while (await speaking()) {
        if (Date.now() > deadline) throw new Error(`${name} never stopped speaking`);
        await sleep(50);
    }
    while (!(await speaking())) {
        if (Date.now() > deadline) throw new Error(`${name} never started speaking`);
        await sleep(50);
    }
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

/** Host plus three guests in one meeting, joined on the cast beat. */
async function assembleCall({ hostViewport = DESKTOP, hostScale = 2, sofiaViewport, sofiaScale = 1 } = {}) {
    const host = await person("host", { viewport: hostViewport, scale: hostScale });
    const { meetingId, beat } = await startMeeting(host);
    const aarav = await person("aarav");
    const sofia = await person("sofia", sofiaViewport ? { viewport: sofiaViewport, scale: sofiaScale } : undefined);
    const jordan = await person("jordan");
    for (const guest of [aarav, sofia, jordan]) await joinRoom(guest, meetingId, beat);
    await host.page.getByTestId("video-tile").nth(3).waitFor().catch(async (error) => {
        console.error(`Host sees ${await host.page.getByTestId("video-tile").count()} tiles`);
        throw error;
    });
    // Every remote camera is actually playing before anything is captured.
    await host.page.waitForFunction(() => [...document.querySelectorAll("video")].filter((video) => video.videoWidth > 0).length >= 4, null, { timeout: 20_000 });
    return { host, aarav, sofia, jordan, meetingId, beat };
}

async function captureStills() {
    // 1. Start: the host alone, invite link copied.
    const solo = await person("host", { viewport: DESKTOP, scale: 2 });
    await startMeeting(solo);
    await solo.page.waitForFunction(() => [...document.querySelectorAll("video")].some((video) => video.videoWidth > 0));
    await solo.page.getByRole("button", { name: /Copy invite/ }).click();
    await solo.page.getByText("Copied").waitFor();
    await settle(solo.page);
    await shot(solo.page, "step-start-desktop");
    await done(solo);

    const phoneHost = await person("host", { viewport: MOBILE, scale: 2 });
    await startMeeting(phoneHost);
    await phoneHost.page.waitForFunction(() => [...document.querySelectorAll("video")].some((video) => video.videoWidth > 0));
    await phoneHost.page.getByRole("button", { name: /Copy invite/ }).click();
    await settle(phoneHost.page);
    await shot(phoneHost.page, "step-start-mobile");
    await done(phoneHost);

    // 2. Share: four people talk.
    const call = await assembleCall({ sofiaViewport: MOBILE, sofiaScale: 2 });
    const { host, sofia } = call;
    for (const [key, text] of CHAT.slice(0, 4)) {
        await say(call[key], text);
        await sleep(300);
    }
    await openChat(host);
    await host.page.getByTestId("chat-log").getByText("deadline is firm").waitFor();
    await settle(host.page);
    await waitForSpeaking(host.page);
    await shot(host.page, "step-share-desktop");
    await sofia.page.getByRole("button", { name: "Close chat" }).click().catch(() => {});
    await sofia.page.getByTestId("video-tile").nth(3).waitFor();
    await settle(sofia.page);
    await waitForSpeaking(sofia.page);
    await shot(sofia.page, "step-share-mobile");

    await say(host, CHAT[4][1]);
    await sleep(500);

    // 3. Recap: the host ends the call.
    await endMeeting(host);
    await sleep(1600); // the recap finishes building in
    await host.page.locator("details summary").click();
    await host.page.evaluate(() => window.scrollTo(0, 0));
    await settle(host.page);
    await shot(host.page, "step-recap-desktop", { fullPage: true });
    await sofia.page.goto(`${BASE}/meetings/${call.meetingId}`);
    await sofia.page.getByRole("heading", { name: "Meeting recap" }).waitFor();
    await sofia.page.locator("details summary").click();
    await sofia.page.evaluate(() => window.scrollTo(0, 0));
    await settle(sofia.page);
    await shot(sofia.page, "step-recap-mobile", { fullPage: true });

    for (const p of [host, call.aarav, sofia, call.jordan]) await done(p);
}

/**
 * Records the page with Chrome's screencast (frames arrive only when pixels
 * change, each with a timestamp) and returns a stop function.
 */
async function startScreencast(page, dir, size) {
    const cdp = await page.context().newCDPSession(page);
    const frames = [];
    cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
        const file = join(dir, `frame-${String(frames.length).padStart(5, "0")}.jpg`);
        frames.push({ file, at: metadata.timestamp });
        await writeFile(file, Buffer.from(data, "base64"));
        await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
    });
    await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: size.width, maxHeight: size.height, everyNthFrame: 1 });

    return async () => {
        await cdp.send("Page.stopScreencast");
        return frames;
    };
}

/** Variable-rate frames to a constant 30 fps clip of exactly `seconds`, as MP4 and WebM, plus a poster of the first frame. */
async function encode(allFrames, dir, seconds, { name, out }, from = allFrames[0].at) {
    // Start at the frame on screen at `from`.
    const frames = allFrames.slice(Math.max(0, allFrames.findLastIndex((frame) => frame.at <= from)));
    const lines = ["ffconcat version 1.0"];
    frames.forEach((frame, index) => {
        const begin = Math.max(frame.at, from);
        const next = frames[index + 1]?.at ?? from + seconds;
        lines.push(`file '${frame.file}'`, `duration ${Math.max(next - begin, 0.001).toFixed(3)}`);
    });
    lines.push(`file '${frames.at(-1).file}'`);
    const list = join(dir, "frames.txt");
    await writeFile(list, lines.join("\n"));

    const input = ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-t", String(seconds), "-an",
        // A short fade out at the loop point, so the recap does not cut hard back to the call.
        "-vf", `scale=${out.width}:${out.height}:flags=lanczos,fps=30,fade=t=out:st=${seconds - 0.45}:d=0.45`];
    execFileSync("ffmpeg", [...input, "-c:v", "libx264", "-preset", "veryslow", "-crf", "26", "-pix_fmt", "yuv420p", "-movflags", "+faststart", join(OUT, `${name}.mp4`)]);
    execFileSync("ffmpeg", [...input, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "38", "-row-mt", "1", join(OUT, `${name}.webm`)]);
    // Poster: the first frame, the four faces, so a visitor sees people before the video plays.
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", frames[0].file, "-vf", `scale=${out.width}:${out.height}:flags=lanczos`,
        "-c:v", "libwebp", "-quality", "80", join(OUT, `${name}-poster.webp`)]);
}

/**
 * The hero loop, about 11 s: four faces with the speaking ring moving, two
 * chat messages, the host presses End, the room folds away and the recap
 * builds in line by line.
 */
async function captureLoop(format) {
    const SECONDS = 12;
    const dir = await mkdtemp(join(tmpdir(), "bridge-hero-"));
    const call = await assembleCall({ hostViewport: format.viewport, hostScale: format.scale });
    const { host } = call;
    // The earlier part of the stand-up is already in the chat. On a phone, where
    // the chat is a full-screen sheet, Maya's decision is sent before the clip too.
    for (const [key, text] of format.phone ? [...CHAT.slice(0, 3), CHAT[4]] : CHAT.slice(0, 3)) {
        await say(call[key], text);
        await sleep(300);
    }
    // Close the host's panel again: the clip opens on the faces.
    const close = host.page.getByRole("button", { name: "Close chat" });
    if (await close.isVisible().catch(() => false)) await close.click();
    await settle(host.page);
    // Jordan's chat is open already, so his message lands without a panel animation.
    await openChat(call.jordan);
    await host.page.getByText(/^Chat/).first().waitFor().catch(() => {});
    // Start the clip as Maya begins to speak: the first frame is four faces and a ring.
    await waitForTurn(host.page, "Maya");

    const startedAt = Promise.resolve(Date.now());
    const mark = async (label) => console.log(`  ${format.name} ${(((Date.now()) - (await startedAt)) / 1000).toFixed(1)} s: ${label}`);
    const stop = await startScreencast(host.page, dir, format.out);
    await sleep(1700);
    // On a phone the chat is a full-screen sheet; the messages arrive as an unread count instead.
    if (!format.phone) await openChat(host);
    await sleep(350);
    await mark("chat open");
    await say(call.jordan, CHAT[3][1]);
    await mark("jordan said");
    await sleep(700);
    if (!format.phone) {
        await say(host, CHAT[4][1]);
        await settle(host.page);
        await mark("maya said");
    }
    await sleep(500);
    // Direct clicks: under four browsers' load, waiting for the dialog's animation to settle cost seconds.
    await host.page.getByTestId("leave-button").dispatchEvent("click");
    await mark("end clicked");
    await sleep(600);
    await host.page.getByTestId("confirm-end-meeting").waitFor();
    await sleep(350);
    await host.page.getByTestId("confirm-end-meeting").dispatchEvent("click");
    await mark("confirmed");
    await host.page.getByRole("heading", { name: "Meeting recap" }).waitFor();
    await host.page.mouse.move(2, 2);
    const ended = Date.now();
    // Let the recap build in, then glide down to the key points and topics (the clip is cut at 12 s).
    await sleep(1300);
    const distance = await host.page.evaluate(() => {
        const points = document.querySelector("#key-points");
        return points ? Math.max(0, points.getBoundingClientRect().top - 120) : 0;
    });
    for (let step = 1; step <= 24; step += 1) {
        const eased = 1 - (1 - step / 24) ** 3;
        await host.page.evaluate((top) => window.scrollTo(0, top), Math.round(distance * eased));
        await sleep(30);
    }
    await sleep(2600);
    console.log(`${format.name}: recap on screen ${((ended - (await startedAt)) / 1000).toFixed(1)} s into the clip`);
    // The screencast sends frames only when pixels change, so the clip runs until now, not until the last frame.
    const stoppedAt = Date.now() / 1000;
    const frames = await stop();

    for (const p of [host, call.aarav, call.sofia, call.jordan]) await done(p);
    const length = frames.at(-1).at - frames[0].at;
    console.log(`${format.name}: ${frames.length} frames over ${length.toFixed(1)} s`);
    const from = (await startedAt) / 1000;
    await encode(frames, dir, Math.min(SECONDS, Math.floor((stoppedAt - from) * 10) / 10), format, from);
    await rm(dir, { recursive: true, force: true });
}

/** Samples which tiles show the speaking ring, every 100 ms, as "t: names". */
async function speakingTimeline(page, seconds) {
    const samples = [];
    const start = Date.now();
    while (Date.now() - start < seconds * 1000) {
        const speaking = await page.evaluate(() => [...document.querySelectorAll('[data-testid="video-tile"]')]
            .filter((tile) => /speaking/.test(tile.className))
            .map((tile) => tile.querySelector('[data-testid="participant-label"]')?.textContent?.split(" ")[0]));
        samples.push(`${((Date.now() - start) / 1000).toFixed(1)}: ${speaking.join(",")}`);
        await sleep(100);
    }
    return samples;
}

if (process.env.CAPTURE_DIAG) {
    const call = await assembleCall({ hostViewport: HERO.viewport, hostScale: 1 });
    console.log((await speakingTimeline(call.host.page, 14)).filter((line, index, all) => line.split(": ")[1] !== all[index - 1]?.split(": ")[1]).join("\n"));
    await Promise.all(browsers.map((browser) => browser.close().catch(() => {})));
    process.exit(0);
}

// CAPTURE_ONLY=stills|hero|phone runs one part, e.g. to redo a clip.
const only = process.env.CAPTURE_ONLY;
await mkdir(OUT, { recursive: true });
try {
    if (!only || only === "stills") await captureStills();
    if (!only || only === "hero") await captureLoop(HERO);
    if (!only || only === "phone") await captureLoop(PHONE);
    await toWebp();
} finally {
    await Promise.all(browsers.map((browser) => browser.close().catch(() => {})));
}
console.log(`Captures written to ${OUT}`);

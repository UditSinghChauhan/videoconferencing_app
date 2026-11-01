// Renders the portfolio card assets from the running landing page:
//   docs/showcase/bridge-og-1200x630.png     Open Graph image (also public/og-image.png)
//   docs/showcase/bridge-cover-1600x1000.png  cover still of the hero
//   docs/showcase/bridge-teaser-chapter.mp4   6-8 s muted loop of the signature chapter
// Needs the web app running (npm run start:e2e) and ffmpeg on PATH:
//   node scripts/capture-showcase.mjs
import { execFileSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const BASE = process.env.CAPTURE_BASE_URL || "http://127.0.0.1:3100";
const OUT = new URL("../../docs/showcase/", import.meta.url).pathname;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });

/** Waits for the hero recording to be playing a few seconds in, on the four faces. */
async function heroReady(page) {
    await page.waitForFunction(() => {
        const video = document.querySelector("video");
        return video && video.readyState >= 3;
    }, null, { timeout: 20_000 });
    await page.evaluate(() => {
        const video = document.querySelector("video");
        video.pause();
        video.currentTime = 1.2;
    });
    await sleep(600);
}

// Open Graph: the headline over the call, 1200 × 630 at 2x then downscaled for crisp type.
{
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await heroReady(page);
    await page.addStyleTag({ content: "header{display:none!important} main{padding-top:0}" });
    await page.evaluate(() => window.scrollTo(0, 70));
    await sleep(500);
    const og = join(OUT, "bridge-og-1200x630.png");
    await page.screenshot({ path: join(OUT, "og@2x.png") });
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", join(OUT, "og@2x.png"), "-vf", "scale=1200:630:flags=lanczos", og]);
    await rm(join(OUT, "og@2x.png"));
    await copyFile(og, new URL("../public/og-image.png", import.meta.url).pathname);
    await page.close();
}

// Cover: the first viewport at 1600 × 1000.
{
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await heroReady(page);
    await page.screenshot({ path: join(OUT, "bridge-cover-1600x1000.png") });
    await page.close();
}

// Teaser: scroll through the signature chapter in about 7 s and record it.
{
    const dir = await mkdtemp(join(tmpdir(), "bridge-teaser-"));
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    const track = await page.evaluate(() => {
        const element = document.querySelector("#signature [class*=track]");
        const rect = element.getBoundingClientRect();
        return { top: rect.top + window.scrollY, range: rect.height - window.innerHeight };
    });
    await page.evaluate((top) => window.scrollTo(0, top), track.top);
    await sleep(1200);

    const cdp = await page.context().newCDPSession(page);
    const frames = [];
    cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
        const file = join(dir, `f-${String(frames.length).padStart(5, "0")}.jpg`);
        frames.push({ file, at: metadata.timestamp });
        await writeFile(file, Buffer.from(data, "base64"));
        await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
    });
    await cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: 1440, maxHeight: 900 });
    const started = Date.now() / 1000;
    const STEPS = 140;
    for (let step = 0; step <= STEPS; step += 1) {
        // Ease in and out so each beat gets a moment.
        const t = step / STEPS;
        const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        await page.evaluate((y) => window.scrollTo(0, y), track.top + track.range * eased);
        await sleep(40);
    }
    await sleep(900);
    const stopped = Date.now() / 1000;
    await cdp.send("Page.stopScreencast");

    const seconds = Math.min(8, stopped - started);
    const lines = ["ffconcat version 1.0"];
    frames.forEach((frame, index) => {
        const begin = Math.max(frame.at, started);
        const next = frames[index + 1]?.at ?? started + seconds;
        lines.push(`file '${frame.file}'`, `duration ${Math.max(next - begin, 0.001).toFixed(3)}`);
    });
    lines.push(`file '${frames.at(-1).file}'`);
    await writeFile(join(dir, "list.txt"), lines.join("\n"));
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", join(dir, "list.txt"), "-t", seconds.toFixed(2), "-an",
        "-vf", "fps=30,scale=1440:900:flags=lanczos", "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        join(OUT, "bridge-teaser-chapter.mp4")]);
    console.log(`Teaser: ${frames.length} frames, ${seconds.toFixed(1)} s`);
    await rm(dir, { recursive: true, force: true });
    await page.close();
}

await browser.close();
console.log(`Showcase assets written to ${OUT}`);

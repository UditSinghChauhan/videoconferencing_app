// Renders each illustrated cast member into a fake camera and microphone for
// Chrome, so the landing captures can be recordings of the running app with
// faces in them (scripts/capture-landing.mjs).
//
// Needs the dev server (the /__cast route exists only in development):
//   cd frontend && npm run start:e2e
// Then: node scripts/render-cast.mjs   (needs ffmpeg on PATH)
//
// Output (git-ignored), per person:
//   capture/cast/<id>.y4m  960 × 540, 30 fps, exactly one 12 s loop
//   capture/cast/<id>.wav  48 kHz mono: silence, plus a voiced signal while that
//                          person speaks in cast/timeline.ts, so Bridge's real
//                          speaking detector puts the ring on the right face
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";
// Node 22 strips the types; the file has no runtime imports.
import { CAST_TIMELINE } from "../src/features/landing/cast/timeline.ts";

const BASE = process.env.CAPTURE_BASE_URL || "http://127.0.0.1:3100";
const OUT = new URL("../../capture/cast/", import.meta.url).pathname;
// 960 × 540 is sharper than any tile it fills (a tile in the 1920 px hero is about
// 900 px wide) and keeps twelve WebRTC encoders affordable during captures.
const SIZE = { width: 960, height: 540 };
const PEOPLE = ["maya", "aarav", "sofia", "jordan"];
const LOOP = CAST_TIMELINE.duration;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** A speech-like signal: a 150 Hz voice with harmonics, opened and closed at syllable rate. */
function writeVoice(person, file) {
    const segments = CAST_TIMELINE.segments.filter((segment) => segment.person === person);
    const gate = segments.map(({ start, end }) => `between(t,${start},${end})`).join("+") || "0";
    const voice = "(sin(2*PI*150*t)+0.5*sin(2*PI*300*t)+0.25*sin(2*PI*450*t))";
    const syllables = "(0.55+0.45*sin(2*PI*4.3*t)*sin(2*PI*1.7*t+1))";
    const expression = `0.32*(${gate})*${voice}*${syllables}`;
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", `aevalsrc=exprs='${expression}':s=48000:d=${LOOP}`,
        "-ac", "1", "-c:a", "pcm_s16le", file]);
}

/**
 * Records one loop of a cast member with Chrome's screencast (each frame
 * carries its own timestamp), aligned to the page's loop start, and writes it
 * as a constant 30 fps y4m.
 */
async function recordFace(browser, person, dir) {
    const context = await browser.newContext({ viewport: SIZE, reducedMotion: "no-preference" });
    const page = await context.newPage();
    await page.goto(`${BASE}/__cast?person=${person}`);
    await page.locator("svg").first().waitFor();
    const loopStart = await page.waitForFunction(() => window.__castLoopStart).then((handle) => handle.jsonValue());

    const cdp = await context.newCDPSession(page);
    const frames = [];
    cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
        const file = join(dir, `${person}-${String(frames.length).padStart(5, "0")}.jpg`);
        frames.push({ file, at: metadata.timestamp });
        await writeFile(file, Buffer.from(data, "base64"));
        await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
    });
    // Start recording within the first loop, keep the whole second loop.
    const from = (loopStart + LOOP * 1000) / 1000;
    const to = from + LOOP;
    await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: SIZE.width, maxHeight: SIZE.height, everyNthFrame: 1 });
    await sleep(Math.max(0, to * 1000 + 400 - Date.now()));
    await cdp.send("Page.stopScreencast");
    await context.close();

    // Each frame lasts until the next one; the clip starts at the frame on screen at `from`.
    const startIndex = Math.max(0, frames.findLastIndex((frame) => frame.at <= from));
    const kept = frames.slice(startIndex).filter((frame) => frame.at < to);
    const lines = ["ffconcat version 1.0"];
    kept.forEach((frame, index) => {
        const begin = Math.max(frame.at, from);
        const end = Math.min(kept[index + 1]?.at ?? to, to);
        lines.push(`file '${frame.file}'`, `duration ${Math.max(end - begin, 0.001).toFixed(4)}`);
    });
    lines.push(`file '${kept.at(-1).file}'`);
    const list = join(dir, `${person}.txt`);
    await writeFile(list, lines.join("\n"));

    const target = join(OUT, `${person}.y4m`);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-t", String(LOOP),
        "-vf", `scale=${SIZE.width}:${SIZE.height}:flags=lanczos,fps=30`, "-pix_fmt", "yuv420p", target]);
    console.log(`${person}: ${kept.length} frames -> ${target}`);
}

await mkdir(OUT, { recursive: true });
const dir = await mkdtemp(join(tmpdir(), "bridge-cast-"));
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
try {
    for (const person of PEOPLE) {
        await recordFace(browser, person, dir);
        writeVoice(person, join(OUT, `${person}.wav`));
    }
} finally {
    await browser.close();
    await rm(dir, { recursive: true, force: true });
}
console.log(`Cast written to ${OUT}`);

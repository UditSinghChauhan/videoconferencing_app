// Renders the portfolio card assets from the running landing page:
//   docs/showcase/bridge-og-1200x630.png     Open Graph image (also public/og-image.png)
//   docs/showcase/bridge-cover-1600x1000.png  cover still of the hero
// Both wait for the hero loop to reach the recap, so the card shows the call and its notes.
// Needs the web app running (npm run start:e2e) and ffmpeg on PATH:
//   node scripts/capture-showcase.mjs
import { execFileSync } from "node:child_process";
import { copyFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const BASE = process.env.CAPTURE_BASE_URL || "http://127.0.0.1:3100";
const OUT = new URL("../../docs/showcase/", import.meta.url).pathname;

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });

/** Opens the landing page and waits until the hero shows the recap card. */
async function openAtRecap(viewport, deviceScaleFactor = 1) {
    const page = await browser.newPage({ viewport, deviceScaleFactor, colorScheme: "light" });
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-phase='recap']", { timeout: 20_000 });
    await page.waitForTimeout(1400);
    return page;
}

// Open Graph: the headline over the call and its recap, 1200 × 630 at 2x then downscaled for crisp type.
{
    const page = await openAtRecap({ width: 1200, height: 630 }, 2);
    await page.addStyleTag({ content: "header{display:none!important}" });
    await page.evaluate(() => window.scrollTo(0, 120));
    await page.waitForTimeout(400);
    const og = join(OUT, "bridge-og-1200x630.png");
    await page.screenshot({ path: join(OUT, "og@2x.png") });
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", join(OUT, "og@2x.png"), "-vf", "scale=1200:630:flags=lanczos", og]);
    await rm(join(OUT, "og@2x.png"));
    await copyFile(og, new URL("../public/og-image.png", import.meta.url).pathname);
    await page.close();
}

// Cover: the first viewport at 1600 × 1000.
{
    const page = await openAtRecap({ width: 1600, height: 1000 });
    await page.screenshot({ path: join(OUT, "bridge-cover-1600x1000.png") });
    await page.close();
}

await browser.close();
console.log(`Showcase assets written to ${OUT}`);

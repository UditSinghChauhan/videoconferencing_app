// Turns a Playwright JSON report into the durations the landing page's
// Verified terminal shows. Durations on the page come only from a real run:
//   PLAYWRIGHT_JSON_OUTPUT_NAME=report.json npx playwright test --reporter=json
//   node scripts/e2e-durations.mjs report.json
// Writes src/features/landing/e2e-run.json. Without it the terminal shows no durations.
import { readFileSync, writeFileSync } from "node:fs";

const source = process.argv[2];
if (!source) {
    console.error("Usage: node scripts/e2e-durations.mjs <playwright-report.json>");
    process.exit(1);
}

const report = JSON.parse(readFileSync(source, "utf8"));
const tests = {};
const walk = (suite) => {
    for (const spec of suite.specs ?? []) {
        for (const test of spec.tests) {
            const result = test.results.at(-1);
            if (result?.status === "passed") tests[spec.title] = result.duration;
        }
    }
    (suite.suites ?? []).forEach(walk);
};
report.suites.forEach(walk);

const out = new URL("../src/features/landing/e2e-run.json", import.meta.url);
writeFileSync(out, `${JSON.stringify({ ranAt: report.stats.startTime, passed: report.stats.expected, failed: report.stats.unexpected, tests }, null, 4)}\n`);
console.log(`Wrote ${Object.keys(tests).length} durations from the run at ${report.stats.startTime}`);

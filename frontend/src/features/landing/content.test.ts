/// <reference types="node" />
// Node types are scoped to this file: it reads the e2e spec from disk; app code stays browser-only.
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { E2E_SPEC_PATH, ENGINEERING, TEST_LINES, VERIFIED } from "./content";

const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const spec = readFileSync(`${repoRoot}${E2E_SPEC_PATH}`, "utf8");

// The landing page says these flows are verified; fail the build if one stops being true.
describe("every Verified flow on the landing page maps to a real e2e test", () => {
    for (const item of VERIFIED) {
        test(item.flow, () => {
            expect(spec).toContain(`test("${item.test}"`);
            expect(spec).toContain(item.step);
            // The deep link on the landing page points at the test's own line.
            const line = TEST_LINES[item.test];
            expect(line, `TEST_LINES is missing "${item.test}"`).toBeDefined();
            expect(spec.split("\n")[(line ?? 0) - 1]).toContain(`test("${item.test}"`);
        });
    }
});

describe("every engineering note links to a file that exists", () => {
    for (const note of ENGINEERING) {
        test(note.label, () => {
            expect(existsSync(`${repoRoot}${note.path}`)).toBe(true);
        });
    }
});

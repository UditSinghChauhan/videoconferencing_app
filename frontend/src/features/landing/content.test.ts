/// <reference types="node" />
// Node types are scoped to this file: it reads source files from disk; app code stays browser-only.
import { existsSync, readFileSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { BENEFITS, FAQ, FEATURES, STEPS, type Evidence } from "./content";
import { STANDUP_RECAP } from "./fixtures";

const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));

const read = (path: string) => {
    const full = join(repoRoot, path);
    expect(existsSync(full), `${path} does not exist`).toBe(true);
    if (statSync(full).isDirectory()) {
        return readdirSync(full).map((name) => readFileSync(join(full, name), "utf8")).join("\n");
    }
    return readFileSync(full, "utf8");
};

const checkEvidence = (evidence: Evidence[]) => {
    expect(evidence.length).toBeGreaterThan(0);
    for (const { path, contains } of evidence) {
        expect(read(path), `${path} should contain ${contains}`).toContain(contains);
    }
};

// Each claim on the landing page names the code that makes it true; fail the build if one stops being true.
describe("landing claims point at code that does what they say", () => {
    const claims = [
        ...BENEFITS.map((claim) => [`benefit: ${claim.title}`, claim.evidence] as const),
        ...STEPS.map((claim) => [`step: ${claim.title}`, claim.evidence] as const),
        ...Object.values(FEATURES).map((claim) => [`feature: ${claim.title}`, claim.evidence] as const),
        ...FAQ.map((item) => [`faq: ${item.question}`, item.evidence] as const)
    ];
    for (const [name, evidence] of claims) {
        test(name, () => checkEvidence(evidence));
    }
});

describe("the recap the page shows is the summariser's real output", () => {
    test("one natural sentence, no attendee list", () => {
        expect(STANDUP_RECAP.conclusion).toBe("Agreed to ship the release on Thursday; the onboarding fix is in review and should merge before lunch.");
        for (const name of STANDUP_RECAP.participantsInvolved) {
            expect(STANDUP_RECAP.conclusion).not.toContain(name);
        }
    });

    test("action items have owners, and the hero shows the first two", () => {
        expect(STANDUP_RECAP.actionItems?.slice(0, 2)).toEqual([
            { owner: "Sofia Rossi", task: "Send the final copy", due: "Wednesday" },
            { owner: "Everyone", task: "Ship the release", due: "Thursday" }
        ]);
    });

    test("key points carry no 'Name:' prefix", () => {
        for (const point of STANDUP_RECAP.keyPoints) {
            expect(point.text).not.toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+:/);
        }
    });
});

test("the removed engineering pages stay removed", () => {
    expect(read("frontend/src/App.tsx")).not.toContain("design-notes");
    expect(existsSync(join(repoRoot, "docs/CASE_STUDY.md"))).toBe(true);
});

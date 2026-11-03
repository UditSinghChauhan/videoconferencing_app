import { expect, test } from "vitest";
// @ts-expect-error The server module is untyped JavaScript.
import { generateMeetingSummary as serverSummaryUntyped } from "../../../../backend/src/utils/meetingSummary.js";
import { DEMO_PARTICIPANTS, DEMO_SCRIPT, DEMO_SCRIPT_END, demoScriptActivity } from "./demoScript";
import { generateMeetingSummary, type ActivityEntry } from "./meetingSummary";

const recap = generateMeetingSummary(demoScriptActivity());
const teammates = new Set(DEMO_PARTICIPANTS.map((p) => p.name));

test("the demo script's recap has at least 3 action items with owners", () => {
    const owned = (recap.actionItems ?? []).filter((item) => item.owner && (teammates.has(item.owner) || item.owner === "Everyone"));
    expect(owned.length).toBeGreaterThanOrEqual(3);
    expect(recap.actionItems?.length).toBeLessThanOrEqual(4);
    expect((recap.actionItems ?? []).filter((item) => item.due).length).toBeGreaterThanOrEqual(2);
});

test("the demo script's recap has a summary and 3–4 topics", () => {
    expect(recap.conclusion).toMatch(/^Agreed to launch the pricing page on Friday/);
    expect(recap.keywords?.length).toBeGreaterThanOrEqual(3);
    expect(recap.keywords?.length).toBeLessThanOrEqual(4);
});

test("the script fits 30–40 seconds, with 6–8 messages and one speaker at a time", () => {
    expect(DEMO_SCRIPT.length).toBeGreaterThanOrEqual(6);
    expect(DEMO_SCRIPT.length).toBeLessThanOrEqual(8);
    expect(DEMO_SCRIPT_END).toBeGreaterThanOrEqual(30);
    expect(DEMO_SCRIPT_END).toBeLessThanOrEqual(40);
    DEMO_SCRIPT.forEach((line, index) => {
        expect(line.end).toBeGreaterThan(line.start);
        expect(line.start).toBeGreaterThanOrEqual(DEMO_SCRIPT[index - 1]?.end ?? 0);
    });
});

test("the server writes the same recap for the demo script", () => {
    const server = (serverSummaryUntyped as (m: { activityLogs: ActivityEntry[] }) => Record<string, unknown>)({ activityLogs: demoScriptActivity() });
    const { generatedAt: _s, ...expected } = server;
    const { generatedAt: _c, ...actual } = recap;
    expect(actual).toEqual(expected);
});

import { describe, expect, test } from "vitest";
// @ts-expect-error The server module is untyped JavaScript; this test is what checks its shape.
import { generateMeetingSummary as serverSummaryUntyped } from "../../../../backend/src/utils/meetingSummary.js";
import { generateMeetingSummary, type ActivityEntry } from "./meetingSummary";

type ServerSummary = (meeting: { activityLogs: ActivityEntry[] }) => Record<string, unknown>;
const serverSummary = serverSummaryUntyped as ServerSummary;

const standUp: ActivityEntry[] = ([
    ["Maya Patel", "Agenda: release checklist first, then the onboarding bug."],
    ["Aarav Mehta", "The onboarding fix is in review and should merge before lunch."],
    ["Sofia Rossi", "Design signed off on the empty states. I’ll follow up with the copy today."],
    ["Jordan Lee", "Next step: we ship the release Thursday, and that deadline is firm."],
    ["Maya Patel", "Decision: Aarav owns the fix, Sofia owns the copy, I’ll update the release plan."]
] as const).map(([username, content]) => ({ type: "chat", username, content }));

const fixtures: Record<string, ActivityEntry[]> = {
    empty: [],
    "joins only": [
        { type: "join", username: "Maya Patel", content: "created and joined the meeting" },
        { type: "join", username: "Jordan Lee", content: "joined the meeting" }
    ],
    "full call": [
        { type: "join", username: "Maya Patel", content: "created and joined the meeting" },
        { type: "join", username: "Aarav Mehta", content: "joined the meeting" },
        { type: "chat", username: "Maya Patel", content: "Agenda: release checklist, then the onboarding bug." },
        { type: "chat", username: "Aarav Mehta", content: "The onboarding fix is in review, should merge before lunch." },
        { type: "chat", username: "Jordan Lee", content: "  We   need to ship the release Thursday, deadline is firm. " },
        { type: "chat", username: "Maya Patel", content: "sounds good" },
        { type: "removed", username: "Jordan Lee", content: "was removed from the meeting" },
        { type: "ended", username: "Maya Patel", content: "ended the meeting" }
    ],
    // The landing captures' stand-up: topics must come out as noun phrases on both sides.
    "landing stand-up": standUp
};

test("the demo recap's topics are noun phrases", () => {
    expect(generateMeetingSummary(standUp).keywords).toEqual([
        "release checklist", "onboarding fix", "release plan", "onboarding bug", "empty states"
    ]);
});

describe("demo recap uses the same rules as the server", () => {
    for (const [name, activityLogs] of Object.entries(fixtures)) {
        test(name, () => {
            const { generatedAt: _server, ...expected } = serverSummary({ activityLogs });
            const { generatedAt: _client, ...actual } = generateMeetingSummary(activityLogs);
            expect(actual).toEqual(expected);
        });
    }
});

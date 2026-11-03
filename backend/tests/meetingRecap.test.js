import test from "node:test";
import assert from "node:assert/strict";

import { generateMeetingSummary } from "../src/utils/meetingSummary.js";
import { getHostDisplayName } from "../src/services/meeting.service.js";

const PEOPLE = ["Maya Patel", "Aarav Mehta", "Sofia Rossi", "Jordan Lee"];

const chat = (username, content) => ({ type: "chat", username, content });

/** A realistic stand-up, written the way people type in a call chat. */
const standUp = [
    { type: "join", username: "Maya Patel", content: "created and joined the meeting" },
    { type: "join", username: "Aarav Mehta", content: "joined the meeting" },
    { type: "join", username: "Sofia Rossi", content: "joined the meeting" },
    { type: "join", username: "Jordan Lee", content: "joined the meeting" },
    chat("Maya Patel", "Agenda: release checklist first, then the onboarding bug."),
    chat("Aarav Mehta", "The onboarding fix is in review and should merge before lunch."),
    chat("Sofia Rossi", "Design signed off on the empty states. I’ll send the final copy by Wednesday."),
    chat("Jordan Lee", "Support tickets about the onboarding bug dropped by half since Monday."),
    chat("Jordan Lee", "Next step: we ship the release Thursday, and that deadline is firm."),
    chat("Maya Patel", "Decision: Aarav owns the fix, and I’ll update the release plan today."),
    { type: "ended", username: "Maya Patel", content: "ended the meeting" }
];

const summary = generateMeetingSummary({ activityLogs: standUp });

test("the summary is one natural sentence built from the outcome and the top topic", () => {
    assert.equal(
        summary.conclusion,
        "Agreed to ship the release on Thursday; the onboarding fix is in review and should merge before lunch."
    );
});

test("the summary never lists the attendees", () => {
    for (const name of PEOPLE) {
        assert.ok(!summary.conclusion.includes(name), `"${name}" should not appear in the summary`);
    }
    assert.doesNotMatch(summary.conclusion, /focused mainly on|and involved/);
});

test("key points are statements with the speaker kept apart, never a 'Name:' prefix", () => {
    assert.ok(summary.keyPoints.length >= 2);
    for (const point of summary.keyPoints) {
        assert.equal(typeof point, "object");
        assert.ok(PEOPLE.includes(point.speaker), `unknown speaker ${point.speaker}`);
        assert.doesNotMatch(point.text, /^[A-Z][a-z]+(?: [A-Z][a-z]+)?:/);
        assert.match(point.text, /[.!?]$/);
    }
    assert.deepEqual(summary.keyPoints[0], {
        speaker: "Aarav Mehta",
        text: "The onboarding fix is in review and should merge before lunch."
    });
});

test("key points leave out the agenda and the lines that became action items", () => {
    const texts = summary.keyPoints.map((point) => point.text);
    assert.ok(texts.includes("Design signed off on the empty states."));
    assert.ok(texts.every((text) => !/^Agenda/i.test(text)));
    assert.ok(texts.every((text) => !/I'll|I’ll|owns/.test(text)));
});

test("ownership and commitment lines become action items with an owner and a due date", () => {
    assert.deepEqual(summary.actionItems, [
        { owner: "Sofia Rossi", task: "Send the final copy", due: "Wednesday" },
        { owner: "Everyone", task: "Ship the release", due: "Thursday" },
        { owner: "Aarav Mehta", task: "Own the onboarding fix" },
        { owner: "Maya Patel", task: "Update the release plan", due: "Today" }
    ]);
});

test("'will', 'by <day>' and 'let's' commitments are recognised", () => {
    const { actionItems } = generateMeetingSummary({
        activityLogs: [
            chat("Maya Patel", "Jordan will draft the launch email by Friday."),
            chat("Jordan Lee", "Sure. Let's freeze the scope tomorrow."),
            chat("Aarav Mehta", "PR is up, I'll drop the link in the channel.")
        ]
    });

    assert.deepEqual(actionItems, [
        { owner: "Jordan Lee", task: "Draft the launch email", due: "Friday" },
        { owner: "Everyone", task: "Freeze the scope", due: "Tomorrow" },
        { owner: "Aarav Mehta", task: "Drop the link in the channel" }
    ]);
});

test("small talk produces no action items", () => {
    const { actionItems } = generateMeetingSummary({
        activityLogs: [chat("Maya Patel", "Morning all!"), chat("Jordan Lee", "Sounds good, thanks everyone")]
    });
    assert.deepEqual(actionItems, []);
});

test("a call without an outcome is summarised by its top two topics", () => {
    const { conclusion } = generateMeetingSummary({
        activityLogs: [
            chat("Maya Patel", "The pricing page copy still feels long."),
            chat("Jordan Lee", "Pricing page traffic doubled after the launch email went out."),
            chat("Sofia Rossi", "The launch email had a broken link in the footer.")
        ]
    });
    assert.equal(conclusion, "Talked through the pricing page and the launch email.");
});

test("the host is shown by display name, never by the internal handle", () => {
    const meeting = {
        hostUsername: "maya_epkkn",
        participants: [
            { username: "jordan_x1", name: "Jordan Lee", role: "participant" },
            { username: "maya_epkkn", name: "Maya Patel", role: "host" }
        ],
        activityLogs: []
    };
    assert.equal(getHostDisplayName(meeting), "Maya Patel");

    // Older meetings stored no display name on the participant: fall back to the name in the activity log.
    const legacy = {
        hostUsername: "maya_epkkn",
        participants: [{ username: "maya_epkkn", name: null, role: "host" }],
        activityLogs: [{ type: "join", username: "Maya Patel", content: "created and joined the meeting" }]
    };
    assert.equal(getHostDisplayName(legacy), "Maya Patel");

    // With no display name anywhere, show nothing rather than a handle.
    const bare = { hostUsername: "maya_epkkn", participants: [{ username: "maya_epkkn", name: null, role: "host" }], activityLogs: [] };
    assert.equal(getHostDisplayName(bare), null);
});

test("without a team outcome, the first person's commitment leads the summary", () => {
    const { conclusion, keywords } = generateMeetingSummary({
        activityLogs: [
            chat("Aarav Mehta", "The flaky checkout test failed twice overnight."),
            chat("Jordan Lee", "I’ll pin the browser version in the checkout test by tomorrow.")
        ]
    });
    assert.equal(conclusion, "Jordan will pin the browser version in the checkout test by tomorrow; the flaky checkout test failed twice overnight.");
    assert.ok(!keywords.some((keyword) => /twice|overnight/.test(keyword)), `adverbs are not topics: ${keywords}`);
});

test("an imperative with a day is a team commitment", () => {
    const summary = generateMeetingSummary({
        activityLogs: [
            chat("Gabe Guest", "Ship the release Thursday, I will follow up with QA."),
            chat("Hannah Host", "Deadline Thursday, Gabe owns the QA follow up.")
        ]
    });
    assert.deepEqual(summary.actionItems, [
        { owner: "Everyone", task: "Ship the release", due: "Thursday" },
        { owner: "Gabe Guest", task: "Follow up with QA" },
        { owner: "Gabe Guest", task: "Own the QA follow up" }
    ]);
    assert.match(summary.conclusion, /^Agreed to ship the release on Thursday/);
});

import test from "node:test";
import assert from "node:assert/strict";

import { generateMeetingSummary } from "../src/utils/meetingSummary.js";

const chat = (lines) => ({
    activityLogs: lines.map(([username, content]) => ({ type: "chat", username, content }))
});

// Verbs, labels and filler that must never surface as a topic chip.
const NOT_TOPICS = [
    "owns", "own", "agenda", "decision", "step", "next", "signed", "merge", "should", "follow", "update",
    "thursday", "today", "lunch", "firm", "fixed", "shipping", "agreed", "moving", "pushed", "looks", "need"
];

const assertNoNoise = (keywords) => {
    for (const word of NOT_TOPICS) {
        assert.ok(!keywords.includes(word), `"${word}" is not a topic: ${JSON.stringify(keywords)}`);
    }
};

test("the landing demo stand-up yields noun phrases, not verbs or labels", () => {
    // The exact transcript the landing captures record (frontend/scripts/capture-landing.mjs).
    const { keywords } = generateMeetingSummary(chat([
        ["Maya Patel", "Agenda: release checklist first, then the onboarding bug."],
        ["Aarav Mehta", "The onboarding fix is in review and should merge before lunch."],
        ["Sofia Rossi", "Design signed off on the empty states. I'll follow up with the copy today."],
        ["Jordan Lee", "Next step: we ship the release Thursday, and that deadline is firm."],
        ["Maya Patel", "Decision: Aarav owns the fix, Sofia owns the copy, I'll update the release plan."]
    ]));

    assertNoNoise(keywords);
    assert.ok(keywords.includes("release checklist"), JSON.stringify(keywords));
    assert.ok(keywords.includes("onboarding bug"), JSON.stringify(keywords));
    assert.ok(keywords.includes("release plan"), JSON.stringify(keywords));
    assert.ok(!keywords.includes("aarav") && !keywords.includes("sofia"), "participant names are not topics");
});

test("a design review surfaces the components under discussion", () => {
    const { keywords } = generateMeetingSummary(chat([
        ["Sofia Rossi", "Can everyone look at the pricing page before we start?"],
        ["Jordan Lee", "The pricing page feels crowded on mobile. The plan cards are too tall."],
        ["Sofia Rossi", "Agreed, I'll shorten the plan cards and move the FAQ below them."],
        ["Aarav Mehta", "The checkout button contrast also fails on the dark theme."],
        ["Sofia Rossi", "Good catch, I'm fixing the checkout button tonight."]
    ]));

    assertNoNoise(keywords);
    assert.deepEqual(keywords.slice(0, 3).sort(), ["checkout button", "plan cards", "pricing page"]);
});

test("an incident review names the systems, not what people did to them", () => {
    const { keywords } = generateMeetingSummary(chat([
        ["Jordan Lee", "The payment webhook started failing at 9:40 after the deploy."],
        ["Aarav Mehta", "Root cause: the retry queue filled up and we dropped events."],
        ["Jordan Lee", "We rolled back the deploy and the payment webhook recovered by 10:05."],
        ["Maya Patel", "Action item: alert on retry queue depth, and add a runbook for the payment webhook."]
    ]));

    assertNoNoise(keywords);
    assert.equal(keywords[0], "payment webhook");
    assert.ok(keywords.includes("retry queue"), JSON.stringify(keywords));
    assert.ok(!keywords.includes("started") && !keywords.includes("rolled") && !keywords.includes("dropped"));
});

test("a hiring sync keeps single-word topics only when they repeat", () => {
    const { keywords } = generateMeetingSummary(chat([
        ["Maya Patel", "Two candidates are left for the frontend role."],
        ["Aarav Mehta", "The first candidate did really well on the take-home exercise."],
        ["Sofia Rossi", "The second candidate is stronger on accessibility, which we need."],
        ["Maya Patel", "Let's schedule a final interview with both candidates next week."]
    ]));

    assertNoNoise(keywords);
    assert.ok(keywords.includes("frontend role"), JSON.stringify(keywords));
    assert.ok(keywords.includes("candidates") || keywords.includes("candidate"), JSON.stringify(keywords));
    assert.ok(!keywords.includes("accessibility"), "a word said once is not a topic on its own");
    assert.ok(!keywords.includes("schedule") && !keywords.includes("week"));
});

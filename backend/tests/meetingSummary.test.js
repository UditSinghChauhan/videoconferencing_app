import test from "node:test";
import assert from "node:assert/strict";

import { generateMeetingSummary } from "../src/utils/meetingSummary.js";

const buildMeeting = (activityLogs) => ({ activityLogs });

test("an empty meeting summarizes without inventing content", () => {
    const summary = generateMeetingSummary(buildMeeting([]));

    assert.deepEqual(summary.keyPoints, []);
    assert.deepEqual(summary.keywords, []);
    assert.deepEqual(summary.participantsInvolved, []);
    assert.match(summary.conclusion, /without enough activity/);
});

test("keywords are ranked by frequency and exclude stop words", () => {
    const summary = generateMeetingSummary(buildMeeting([
        {
            type: "chat",
            username: "alice",
            content: "We should ship the deployment pipeline before the deadline"
        },
        { type: "chat", username: "bob", content: "ok" },
        { type: "chat", username: "alice", content: "pipeline pipeline notes" }
    ]));

    assert.equal(summary.keywords[0], "pipeline");
    assert.ok(summary.keywords.includes("deployment"));
    assert.ok(!summary.keywords.includes("should"), "stop words must be filtered out");
    assert.ok(!summary.keywords.includes("before"), "stop words must be filtered out");
    assert.ok(!summary.keywords.includes("the"), "short words must be filtered out");
});

test("participants are de-duplicated in first-seen order", () => {
    const summary = generateMeetingSummary(buildMeeting([
        { type: "chat", username: "alice", content: "first" },
        { type: "chat", username: "bob", content: "second" },
        { type: "chat", username: "alice", content: "third" }
    ]));

    assert.deepEqual(summary.participantsInvolved, ["alice", "bob"]);
});

test("sentences containing decision words rank above small talk", () => {
    const summary = generateMeetingSummary(buildMeeting([
        { type: "chat", username: "bob", content: "hey" },
        {
            type: "chat",
            username: "alice",
            content: "We must decide the release plan before the deadline today"
        }
    ]));

    assert.match(summary.keyPoints[0], /We must decide the release plan/);
});

test("at most three key points are returned", () => {
    const summary = generateMeetingSummary(buildMeeting(
        Array.from({ length: 6 }, (_, index) => ({
            type: "chat",
            username: "alice",
            content: `We should decide item number ${index} before the deadline arrives`
        }))
    ));

    assert.equal(summary.keyPoints.length, 3);
});

test("non-chat activity is reported as highlights rather than key points", () => {
    const summary = generateMeetingSummary(buildMeeting([
        { type: "join", username: "alice", content: "joined the meeting" },
        { type: "chat", username: "bob", content: "hello everyone" }
    ]));

    assert.equal(summary.highlights.length, 1);
    assert.match(summary.highlights[0], /alice joined the meeting/);
    assert.ok(summary.keyPoints.every((point) => !point.includes("joined the meeting")));
});

test("blank chat messages are ignored", () => {
    const summary = generateMeetingSummary(buildMeeting([
        { type: "chat", username: "alice", content: "   " },
        { type: "chat", username: "bob", content: "actual message content here" }
    ]));

    assert.equal(summary.keyPoints.length, 1);
    assert.match(summary.keyPoints[0], /bob: actual message content here/);
});

test("the summary is deterministic for identical input", () => {
    const logs = [
        { type: "chat", username: "alice", content: "We should ship the pipeline" },
        { type: "chat", username: "bob", content: "agreed on the pipeline plan" }
    ];

    const first = generateMeetingSummary(buildMeeting(logs));
    const second = generateMeetingSummary(buildMeeting(logs));

    assert.deepEqual(first.keyPoints, second.keyPoints);
    assert.deepEqual(first.keywords, second.keywords);
    assert.equal(first.conclusion, second.conclusion);
});

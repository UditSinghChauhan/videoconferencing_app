import test from "node:test";
import assert from "node:assert/strict";

import {
    csrfHeaderSchema,
    loginSchema,
    registerSchema
} from "../src/validators/user.schemas.js";
import {
    meetingIdSchema,
    removeParticipantSchema,
    updateMeetingSettingsSchema
} from "../src/validators/meeting.schemas.js";

const validRegistration = {
    name: "Alice Example",
    username: "alice",
    password: "Passw0rd"
};

test("registerSchema accepts a valid registration", () => {
    const result = registerSchema.safeParse(validRegistration);

    assert.equal(result.success, true);
});

test("registerSchema rejects a password without an uppercase letter", () => {
    const result = registerSchema.safeParse({ ...validRegistration, password: "passw0rd" });

    assert.equal(result.success, false);
    assert.match(result.error.issues[0].message, /uppercase/);
});

test("registerSchema rejects a password without a digit", () => {
    const result = registerSchema.safeParse({ ...validRegistration, password: "Password" });

    assert.equal(result.success, false);
});

test("registerSchema rejects a password shorter than six characters", () => {
    const result = registerSchema.safeParse({ ...validRegistration, password: "Pa1" });

    assert.equal(result.success, false);
});

test("registerSchema rejects a username shorter than three characters", () => {
    const result = registerSchema.safeParse({ ...validRegistration, username: "al" });

    assert.equal(result.success, false);
});

test("registerSchema rejects a name that is only whitespace", () => {
    const result = registerSchema.safeParse({ ...validRegistration, name: "   " });

    assert.equal(result.success, false);
});

test("registerSchema trims surrounding whitespace from the username", () => {
    const result = registerSchema.safeParse({ ...validRegistration, username: "  alice  " });

    assert.equal(result.success, true);
    assert.equal(result.data.username, "alice");
});

test("loginSchema requires both username and password", () => {
    assert.equal(loginSchema.safeParse({ username: "alice" }).success, false);
    assert.equal(loginSchema.safeParse({ password: "Passw0rd" }).success, false);
    assert.equal(loginSchema.safeParse({ username: "alice", password: "Passw0rd" }).success, true);
});

test("csrfHeaderSchema requires a non-empty x-csrf-token header", () => {
    assert.equal(csrfHeaderSchema.safeParse({}).success, false);
    assert.equal(csrfHeaderSchema.safeParse({ "x-csrf-token": "   " }).success, false);
    assert.equal(csrfHeaderSchema.safeParse({ "x-csrf-token": "abc123" }).success, true);
});

test("meetingIdSchema enforces a minimum meeting id length", () => {
    assert.equal(meetingIdSchema.safeParse({ meetingId: "ab" }).success, false);
    assert.equal(meetingIdSchema.safeParse({ meetingId: "room-1" }).success, true);
});

test("meetingIdSchema rejects an over-long meeting id", () => {
    const result = meetingIdSchema.safeParse({ meetingId: "a".repeat(101) });

    assert.equal(result.success, false);
});

test("updateMeetingSettingsSchema rejects an empty settings payload", () => {
    const result = updateMeetingSettingsSchema.safeParse({});

    assert.equal(result.success, false);
    assert.match(result.error.issues[0].message, /At least one meeting setting/);
});

test("updateMeetingSettingsSchema accepts a single setting", () => {
    const result = updateMeetingSettingsSchema.safeParse({ allowChat: false });

    assert.equal(result.success, true);
});

test("updateMeetingSettingsSchema rejects a non-boolean setting", () => {
    const result = updateMeetingSettingsSchema.safeParse({ allowChat: "false" });

    assert.equal(result.success, false);
});

test("removeParticipantSchema requires a participant user id", () => {
    assert.equal(removeParticipantSchema.safeParse({}).success, false);
    assert.equal(removeParticipantSchema.safeParse({ participantUserId: "  " }).success, false);
    assert.equal(removeParticipantSchema.safeParse({ participantUserId: "user-2" }).success, true);
});

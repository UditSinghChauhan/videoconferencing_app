import test from "node:test";
import assert from "node:assert/strict";

import { generateMeetingCode, MEETING_CODE_PATTERN, MEETING_ID_PATTERN } from "../src/utils/meetingCode.js";

test("generateMeetingCode produces readable xxx-xxxx-xxx codes", () => {
    for (let i = 0; i < 200; i += 1) {
        const code = generateMeetingCode();
        assert.match(code, MEETING_CODE_PATTERN);
        assert.doesNotMatch(code, /[ilo]/, "look-alike letters are excluded");
    }
});

test("generated codes are valid meeting ids", () => {
    assert.match(generateMeetingCode(), MEETING_ID_PATTERN);
});

test("generateMeetingCode does not repeat across a large sample", () => {
    const codes = new Set(Array.from({ length: 5000 }, generateMeetingCode));
    assert.equal(codes.size, 5000);
});

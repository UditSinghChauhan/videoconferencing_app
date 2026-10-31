import { describe, expect, test } from "vitest";
import { avatarColorFor, formatDuration, formatElapsed, formatRelative, initialsFor, pluralize } from "./format";

describe("formatDuration", () => {
    test("handles missing values", () => {
        expect(formatDuration(null)).toBeNull();
        expect(formatDuration(undefined)).toBeNull();
    });

    test("formats short, minute and hour durations", () => {
        expect(formatDuration(20_000)).toBe("under a minute");
        expect(formatDuration(45 * 60_000)).toBe("45 min");
        expect(formatDuration(65 * 60_000)).toBe("1 h 05 min");
    });
});

describe("formatElapsed", () => {
    test("uses m:ss under an hour and h:mm:ss after", () => {
        expect(formatElapsed(0)).toBe("0:00");
        expect(formatElapsed(249_000)).toBe("4:09");
        expect(formatElapsed(3_753_000)).toBe("1:02:33");
    });

    test("never goes negative when clocks disagree", () => {
        expect(formatElapsed(-5_000)).toBe("0:00");
    });
});

describe("formatRelative", () => {
    const now = new Date("2026-10-31T12:00:00Z");

    test("collapses the last minute to 'just now'", () => {
        expect(formatRelative("2026-10-31T11:59:30Z", now)).toBe("just now");
    });

    test("uses minutes and hours for recent times", () => {
        expect(formatRelative("2026-10-31T11:48:00Z", now)).toMatch(/12 minutes ago/);
        expect(formatRelative("2026-10-31T09:00:00Z", now)).toMatch(/3 hours ago/);
    });
});

describe("initialsFor", () => {
    test("takes first and last word", () => {
        expect(initialsFor("Udit Singh Chauhan")).toBe("UC");
        expect(initialsFor("maya")).toBe("M");
        expect(initialsFor("john_smith")).toBe("JS");
        expect(initialsFor("  ")).toBe("?");
    });
});

test("avatarColorFor is stable per name", () => {
    expect(avatarColorFor("Maya")).toBe(avatarColorFor("Maya"));
});

test("pluralize", () => {
    expect(pluralize(1, "person", "people")).toBe("1 person");
    expect(pluralize(3, "person", "people")).toBe("3 people");
});

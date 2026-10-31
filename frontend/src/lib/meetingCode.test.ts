import { describe, expect, test } from "vitest";
import { inviteLinkFor, parseMeetingInput } from "./meetingCode";

describe("parseMeetingInput", () => {
    test("accepts a bare code", () => {
        expect(parseMeetingInput("kmt-vrqp-xhw")).toBe("kmt-vrqp-xhw");
    });

    test("trims and removes internal whitespace", () => {
        expect(parseMeetingInput("  kmt - vrqp - xhw ")).toBe("kmt-vrqp-xhw");
    });

    test("extracts the code from a pasted invite link", () => {
        expect(parseMeetingInput("https://bridgefrontend.onrender.com/room/kmt-vrqp-xhw?x=1")).toBe("kmt-vrqp-xhw");
    });

    test("keeps legacy, user-chosen room names", () => {
        expect(parseMeetingInput("design_review-2")).toBe("design_review-2");
    });

    test("rejects empty and unsafe input", () => {
        expect(parseMeetingInput("")).toBeNull();
        expect(parseMeetingInput("ab")).toBeNull();
        expect(parseMeetingInput("../etc/passwd")).toBeNull();
        expect(parseMeetingInput("%E0%A4%A")).toBeNull();
    });
});

test("inviteLinkFor builds an absolute room URL", () => {
    expect(inviteLinkFor("kmt-vrqp-xhw", "https://bridge.app")).toBe("https://bridge.app/room/kmt-vrqp-xhw");
});

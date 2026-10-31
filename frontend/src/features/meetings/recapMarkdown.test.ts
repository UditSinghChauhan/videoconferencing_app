import { expect, test } from "vitest";
import { recapToMarkdown } from "./recapMarkdown";

test("recapToMarkdown renders only the sections that have content", () => {
    const markdown = recapToMarkdown({
        meetingId: "kmt-vrqp-xhw",
        status: "ended",
        durationMs: 25 * 60_000,
        summary: {
            generatedAt: "2026-10-31T12:00:00Z",
            keyPoints: ["Maya: ship the release on Thursday"],
            highlights: [],
            keywords: ["release", "thursday"],
            participantsInvolved: ["Maya", "Jordan"],
            conclusion: "The meeting focused mainly on release."
        }
    });

    expect(markdown).toContain("# Meeting recap · kmt-vrqp-xhw");
    expect(markdown).toContain("25 min · Maya, Jordan");
    expect(markdown).toContain("## Key points\n- Maya: ship the release on Thursday");
    expect(markdown).not.toContain("## Highlights");
    expect(markdown).toContain("**Topics:** release, thursday");
});

import { expect, test } from "vitest";
import { recapToMarkdown } from "./recapMarkdown";

test("recapToMarkdown renders the recap in page order and only the sections that have content", () => {
    const markdown = recapToMarkdown({
        meetingId: "kmt-vrqp-xhw",
        status: "ended",
        durationMs: 25 * 60_000,
        summary: {
            generatedAt: "2026-10-31T12:00:00Z",
            keyPoints: [{ speaker: "Jordan", text: "Support tickets dropped by half." }],
            actionItems: [{ owner: "Everyone", task: "Ship the release", due: "Thursday" }],
            highlights: ["Maya ended the meeting"],
            keywords: ["release", "support tickets"],
            participantsInvolved: ["Maya", "Jordan"],
            conclusion: "Agreed to ship the release on Thursday."
        }
    });

    expect(markdown).toContain("# Meeting recap · kmt-vrqp-xhw");
    expect(markdown).toContain("25 min · Maya, Jordan");
    expect(markdown).toContain("Agreed to ship the release on Thursday.\n\n## Action items\n- [ ] Ship the release (Everyone, Thursday)");
    expect(markdown).toContain("## Key points\n- Support tickets dropped by half. (Jordan)");
    expect(markdown).not.toContain("Highlights");
    expect(markdown).toContain("**Topics:** release, support tickets");
});

test("recapToMarkdown leaves out sections a recap does not have", () => {
    const markdown = recapToMarkdown({
        meetingId: "abc-defg-hij",
        status: "ended",
        summary: { generatedAt: null, keyPoints: [], highlights: [], keywords: [], participantsInvolved: [], conclusion: "" }
    });
    expect(markdown).toBe("# Meeting recap · abc-defg-hij\n");
});

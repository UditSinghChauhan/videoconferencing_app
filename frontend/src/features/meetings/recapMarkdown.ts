import { formatDateTime, formatDuration } from "../../lib/format";
import type { MeetingRecap } from "../../lib/types";

/** Plain-text export people can paste into Slack, Notion or an email. */
export const recapToMarkdown = (recap: MeetingRecap): string => {
    const { summary } = recap;
    const lines: string[] = [`# Meeting recap · ${recap.meetingId}`];
    const facts = [
        recap.createdAt ? formatDateTime(recap.createdAt) : null,
        formatDuration(recap.durationMs),
        summary.participantsInvolved.length ? summary.participantsInvolved.join(", ") : null
    ].filter(Boolean);

    if (facts.length) lines.push("", facts.join(" · "));
    if (summary.conclusion) lines.push("", summary.conclusion);
    if (summary.keyPoints.length) lines.push("", "## Key points", ...summary.keyPoints.map((point) => `- ${point}`));
    if (summary.highlights.length) lines.push("", "## Highlights", ...summary.highlights.map((item) => `- ${item}`));
    if (summary.keywords.length) lines.push("", `**Topics:** ${summary.keywords.join(", ")}`);

    return `${lines.join("\n")}\n`;
};

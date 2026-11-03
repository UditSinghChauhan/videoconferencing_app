import { formatDateTime, formatDuration } from "../../lib/format";
import type { MeetingRecap } from "../../lib/types";

/** Plain-text export people can paste into Slack, Notion or an email. Same order as the recap page. */
export const recapToMarkdown = (recap: MeetingRecap): string => {
    const { summary } = recap;
    const actionItems = summary.actionItems ?? [];
    const lines: string[] = [`# Meeting recap · ${recap.meetingId}`];
    const facts = [
        recap.createdAt ? formatDateTime(recap.createdAt) : null,
        formatDuration(recap.durationMs),
        summary.participantsInvolved.length ? summary.participantsInvolved.join(", ") : null
    ].filter(Boolean);

    if (facts.length) lines.push("", facts.join(" · "));
    if (summary.conclusion) lines.push("", summary.conclusion);
    if (actionItems.length) {
        lines.push("", "## Action items", ...actionItems.map((item) => `- [ ] ${item.task} (${[item.owner, item.due].filter(Boolean).join(", ")})`));
    }
    if (summary.keyPoints.length) {
        lines.push("", "## Key points", ...summary.keyPoints.map((point) => `- ${point.text}${point.speaker ? ` (${point.speaker})` : ""}`));
    }
    if (summary.keywords.length) lines.push("", `**Topics:** ${summary.keywords.join(", ")}`);

    return `${lines.join("\n")}\n`;
};

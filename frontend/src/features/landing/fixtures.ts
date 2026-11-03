/**
 * The stand-up the landing page shows: the same five messages the captures
 * record (scripts/capture-landing.mjs). The recap is computed by the real
 * summariser (the demo's browser copy of backend/src/utils/meetingSummary.js),
 * never typed by hand, so the page shows exactly what Bridge would write.
 */
import { generateMeetingSummary, type ActivityEntry } from "../demo/meetingSummary";
import type { CastId } from "./cast/people";

export interface StandupMessage {
    from: CastId;
    sender: string;
    text: string;
    /** Clock time shown in the chat. */
    time: string;
    /** The line carries a decision or deadline; highlighted in the chapter. */
    decision?: boolean;
}

export const STANDUP: StandupMessage[] = [
    { from: "maya", sender: "Maya Patel", text: "Agenda: release checklist first, then the onboarding bug.", time: "10:02" },
    { from: "aarav", sender: "Aarav Mehta", text: "The onboarding fix is in review and should merge before lunch.", time: "10:03" },
    { from: "sofia", sender: "Sofia Rossi", text: "Design signed off on the empty states. I’ll follow up with the copy today.", time: "10:04" },
    { from: "jordan", sender: "Jordan Lee", text: "Next step: we ship the release Thursday, and that deadline is firm.", time: "10:05", decision: true },
    { from: "maya", sender: "Maya Patel", text: "Decision: Aarav owns the fix, Sofia owns the copy, I’ll update the release plan.", time: "10:06", decision: true }
];

const activity: ActivityEntry[] = [
    { type: "join", username: "Maya Patel", content: "created and joined the meeting" },
    { type: "join", username: "Aarav Mehta", content: "joined the meeting" },
    { type: "join", username: "Sofia Rossi", content: "joined the meeting" },
    { type: "join", username: "Jordan Lee", content: "joined the meeting" },
    ...STANDUP.map((message): ActivityEntry => ({ type: "chat", username: message.sender, content: message.text })),
    { type: "ended", username: "Maya Patel", content: "ended the meeting" }
];

/** What Bridge's summariser writes for this stand-up. A fixed clock keeps it stable. */
export const STANDUP_RECAP = generateMeetingSummary(activity, new Date("2026-10-29T10:07:00Z"));

/** The stand-up as a full recap record, for exports such as Copy as Markdown. */
export const STANDUP_MEETING = {
    meetingId: "kmt-vrqp-xhw",
    status: "ended" as const,
    hostUsername: "maya",
    createdAt: "2026-10-29T10:01:00Z",
    endedAt: "2026-10-29T10:07:00Z",
    durationMs: 6 * 60 * 1000,
    participantCount: 4,
    summary: STANDUP_RECAP,
    chat: STANDUP.map((message) => ({ sender: message.sender, content: message.text, sentAt: `2026-10-29T${message.time}:00Z` }))
};

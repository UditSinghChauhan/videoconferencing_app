/**
 * The stand-up the landing page shows. The recap is computed by the real
 * summariser (the demo's browser copy of backend/src/utils/meetingSummary.js),
 * never typed by hand, so the page shows exactly what Bridge would write.
 */
import { generateMeetingSummary, type ActivityEntry } from "../demo/meetingSummary";
import type { MeetingRecap } from "../../lib/types";
import type { CastId } from "./cast/people";

export interface StandupMessage {
    from: CastId;
    sender: string;
    text: string;
    /** Clock time shown in the chat. */
    time: string;
}

export const STANDUP: StandupMessage[] = [
    { from: "maya", sender: "Maya Patel", text: "Agenda: release checklist first, then the onboarding bug.", time: "10:02" },
    { from: "aarav", sender: "Aarav Mehta", text: "The onboarding fix is in review and should merge before lunch.", time: "10:04" },
    { from: "sofia", sender: "Sofia Rossi", text: "Design signed off on the empty states. I’ll send the final copy by Wednesday.", time: "10:07" },
    { from: "jordan", sender: "Jordan Lee", text: "Support tickets about the onboarding bug dropped by half since Monday.", time: "10:11" },
    { from: "jordan", sender: "Jordan Lee", text: "Next step: we ship the release Thursday, and that deadline is firm.", time: "10:14" },
    { from: "maya", sender: "Maya Patel", text: "Decision: Aarav owns the fix, and I’ll update the release plan today.", time: "10:17" }
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
export const STANDUP_RECAP = generateMeetingSummary(activity, new Date("2026-10-29T10:18:00Z"));

export const MEETING_CODE = "kmt-vrqp-xhw";

/** The stand-up as a full recap record: 18 minutes, 4 people, hosted by Maya. */
export const STANDUP_MEETING: MeetingRecap = {
    meetingId: MEETING_CODE,
    status: "ended",
    hostName: "Maya Patel",
    createdAt: "2026-10-29T10:00:00Z",
    endedAt: "2026-10-29T10:18:00Z",
    durationMs: 18 * 60 * 1000,
    participantCount: 4,
    summary: STANDUP_RECAP,
    chat: STANDUP.map((message) => ({ sender: message.sender, content: message.text, sentAt: `2026-10-29T${message.time}:00Z` }))
};

/** Past meetings for the history card: each recap sentence is the summariser's own output for that call. */
const pastCall = (lines: [string, string][], ended: string) =>
    generateMeetingSummary(lines.map(([username, content]): ActivityEntry => ({ type: "chat", username, content })), new Date(ended)).conclusion;

export const HISTORY = [
    { code: MEETING_CODE, when: "Thu 10:00", duration: "18 min", people: ["maya", "aarav", "sofia", "jordan"] as CastId[], summary: STANDUP_RECAP.conclusion },
    {
        code: "pfa-wnbe-tqc",
        when: "Tue 15:30",
        duration: "24 min",
        people: ["sofia", "maya", "jordan"] as CastId[],
        summary: pastCall([
            ["Sofia Rossi", "The pricing page copy still feels long."],
            ["Jordan Lee", "Pricing page traffic doubled after the launch email went out."],
            ["Maya Patel", "Let's cut the pricing page to one screen by Friday."]
        ], "2026-10-27T15:54:00Z")
    },
    {
        code: "gzu-hkrd-mle",
        when: "Mon 09:15",
        duration: "11 min",
        people: ["aarav", "jordan"] as CastId[],
        summary: pastCall([
            ["Aarav Mehta", "The flaky checkout test failed twice overnight."],
            ["Jordan Lee", "I'll pin the browser version in the checkout test today."]
        ], "2026-10-26T09:26:00Z")
    }
];

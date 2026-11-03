/** Sample data for the public demo. Everything here is simulated. */
import type { CastId } from "../landing/cast/people";
import type { ActivityEntry } from "./meetingSummary";

export interface DemoParticipant {
    id: CastId;
    name: string;
    micOn: boolean;
}

export const DEMO_MEETING_ID = "demo-room-bridge";

/** The teammates are the landing page's illustrated cast, so the demo looks like the hero promised. */
export const DEMO_PARTICIPANTS: DemoParticipant[] = [
    { id: "maya", name: "Maya Patel", micOn: true },
    { id: "aarav", name: "Aarav Mehta", micOn: true },
    { id: "jordan", name: "Jordan Lee", micOn: true }
];

export interface DemoLine {
    speaker: CastId;
    /** Seconds after the visitor joins: the speaking ring is on this person from `start` to `end`… */
    start: number;
    end: number;
    /** …and at `end` they post this in the chat. */
    text: string;
}

/**
 * The stand-up the visitor walks into: about 35 seconds, three people taking
 * turns. Written so the real summariser (meetingSummary.ts) produces a full
 * recap: a one-line summary, four action items with owners (three with a day)
 * and four topics. meetingSummary.test.ts holds it to that.
 */
export const DEMO_SCRIPT: DemoLine[] = [
    { speaker: "maya", start: 1.2, end: 4.4, text: "Morning! Agenda: the pricing page, then the signup bug." },
    { speaker: "aarav", start: 5.2, end: 9.2, text: "The signup bug is fixed in staging, and I'll merge the fix by Wednesday." },
    { speaker: "jordan", start: 10, end: 13.6, text: "Support tickets about signup are down by a third since the hotfix." },
    { speaker: "maya", start: 14.4, end: 18, text: "Good. The launch email for the pricing page still needs a final pass." },
    { speaker: "jordan", start: 18.8, end: 22.4, text: "I'll send the launch email to design by Thursday." },
    { speaker: "aarav", start: 23.2, end: 26.8, text: "I'll add a regression test for the signup bug." },
    { speaker: "maya", start: 27.6, end: 31.6, text: "Next step: we launch the pricing page on Friday." }
];

/** Seconds after joining when the script is over and the room suggests ending the call. */
export const DEMO_SCRIPT_END = (DEMO_SCRIPT[DEMO_SCRIPT.length - 1]?.end ?? 0) + 1;

const nameOf = (id: CastId) => DEMO_PARTICIPANTS.find((p) => p.id === id)?.name ?? id;

/** The activity log of a visitor who joins, watches the whole script and ends the call. */
export const demoScriptActivity = (): ActivityEntry[] => [
    { type: "join", username: "You", content: "created and joined the meeting" },
    ...DEMO_PARTICIPANTS.map<ActivityEntry>((p) => ({ type: "join", username: p.name, content: "joined the meeting" })),
    ...DEMO_SCRIPT.map<ActivityEntry>((line) => ({ type: "chat", username: nameOf(line.speaker), content: line.text })),
    { type: "ended", username: "You", content: "ended the meeting" }
];

/** What a teammate says back when the visitor types in the chat. */
export const DEMO_REPLIES: Record<string, string[]> = {
    "Maya Patel": [
        "Good point, noted.",
        "That works for me.",
        "Agreed, that fits the plan."
    ],
    "Jordan Lee": [
        "Agreed. Support will be happy to hear it.",
        "Makes sense to me.",
        "Good call."
    ],
    "Aarav Mehta": [
        "Makes sense.",
        "Sounds right to me.",
        "Good catch, thanks."
    ]
};

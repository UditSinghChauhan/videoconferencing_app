/** Sample data for the public demo. Everything here is simulated. */

export interface DemoParticipant {
    id: string;
    name: string;
    micOn: boolean;
}

export const DEMO_MEETING_ID = "demo-room-bridge";

export const DEMO_PARTICIPANTS: DemoParticipant[] = [
    { id: "maya", name: "Maya Patel", micOn: true },
    { id: "jordan", name: "Jordan Lee", micOn: false },
    { id: "aarav", name: "Aarav Mehta", micOn: true }
];

export const DEMO_OPENING_CHAT: { sender: string; text: string; offsetSeconds: number }[] = [
    { sender: "Maya Patel", text: "Morning! Agenda: release checklist, then the onboarding bug.", offsetSeconds: 240 },
    { sender: "Aarav Mehta", text: "The onboarding fix is in review, should merge before lunch.", offsetSeconds: 180 },
    { sender: "Jordan Lee", text: "I'll share the dashboard numbers after that.", offsetSeconds: 120 }
];

export const DEMO_REPLIES: Record<string, string[]> = {
    "Maya Patel": [
        "Good point. Let's add that to the action items.",
        "Can you own that? Deadline Thursday works for me.",
        "That's the last item on the release checklist."
    ],
    "Jordan Lee": [
        "Agreed. I'll follow up with the backend team today.",
        "Numbers look healthy: activation is up 12% week over week.",
        "I can take notes for anyone who couldn't join."
    ],
    "Aarav Mehta": [
        "Makes sense. I'll update the ticket after the call.",
        "We should ship the fix before we announce anything.",
        "PR is up, I'll drop the link in the channel."
    ]
};

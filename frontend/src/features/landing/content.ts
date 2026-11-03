/**
 * Copy for the landing page. Every product claim names the file that makes
 * it true and a line that must exist there; content.test.ts fails the build
 * if a claim stops matching the code.
 */

export interface Evidence {
    /** Repository-relative path. */
    path: string;
    /** Text that must appear in that file. */
    contains: string;
}

export interface Claim {
    title: string;
    body: string;
    evidence: Evidence[];
}

export const BENEFITS: Claim[] = [
    {
        title: "Join from a link",
        body: "Open it in the browser. Nothing to install.",
        evidence: [{ path: "frontend/src/features/room/SidePanel.tsx", contains: "Copy invite link" }]
    },
    {
        title: "Notes the second it ends",
        body: "Summary, action items and transcript for everyone.",
        evidence: [
            { path: "backend/src/services/meeting.service.js", contains: "meeting.summary = generateMeetingSummary(meeting);" },
            { path: "frontend/src/features/meetings/RecapView.tsx", contains: "Action items" }
        ]
    },
    {
        title: "Private by design",
        body: "Video goes directly between you, never through our server.",
        evidence: [{ path: "frontend/src/features/room/peerMesh.ts", contains: "new RTCPeerConnection" }]
    }
];

export const STEPS: (Claim & { heading: string })[] = [
    {
        title: "Start",
        heading: "Check your camera, then start",
        body: "One click makes a room. The lobby checks your camera and microphone before anyone sees you.",
        evidence: [{ path: "frontend/src/features/room/Lobby.tsx", contains: "deviceCopy(micStatus, micOn, \"Microphone\")" }]
    },
    {
        title: "Share",
        heading: "Send the link, people join",
        body: "Copy the invite link. People join in their browser and appear the moment they arrive.",
        evidence: [{ path: "frontend/src/features/room/SidePanel.tsx", contains: "Link copied" }]
    },
    {
        title: "Recap",
        heading: "End the call, get the notes",
        body: "The host ends the call and everyone gets the summary and action items in their history.",
        evidence: [{ path: "backend/src/utils/meetingSummary.js", contains: "actionItems" }]
    }
];

export const FEATURES: Record<"recap" | "chat" | "host" | "screen" | "reconnect" | "history", Claim> = {
    recap: {
        title: "A recap you can paste anywhere",
        body: "Summary, action items with owners, key points and topics. Copy it as Markdown for Slack, Notion or email.",
        evidence: [{ path: "frontend/src/features/meetings/recapMarkdown.ts", contains: "## Action items" }]
    },
    chat: {
        title: "Chat during the call",
        body: "Messages arrive for everyone at once, and they become the recap.",
        evidence: [{ path: "backend/src/controllers/socketManager.js", contains: "\"chat-message\"" }]
    },
    host: {
        title: "Host controls",
        body: "Only the host can remove someone, and Bridge asks first.",
        evidence: [
            { path: "frontend/src/features/room/RoomView.tsx", contains: "from the call?" },
            { path: "backend/src/services/meeting.service.js", contains: "const removeParticipant" }
        ]
    },
    screen: {
        title: "Screen share",
        body: "Share a window or a whole screen; it is shown in full, never cropped.",
        evidence: [{ path: "frontend/src/features/room/ControlBar.tsx", contains: "onToggleScreen" }]
    },
    reconnect: {
        title: "Back after a drop",
        body: "If the network blinks, Bridge reconnects you to the same call on its own.",
        evidence: [
            { path: "frontend/src/features/room/RoomView.tsx", contains: "Reconnecting…" },
            { path: "frontend/src/features/room/useMeetingConnection.ts", contains: "reconnectionAttempts" }
        ]
    },
    history: {
        title: "Meeting history",
        body: "Every call you were in, with its recap, a click away.",
        evidence: [{ path: "frontend/src/pages/HistoryPage.tsx", contains: "MeetingList" }]
    }
};

export interface Question {
    question: string;
    answer: string;
    evidence: Evidence[];
}

export const FAQ: Question[] = [
    {
        question: "Is it free?",
        answer: "Yes. There is no paid plan and no card to enter. Bridge runs on free hosting, so the first visit after a quiet spell can take a few seconds while the server wakes up.",
        evidence: [{ path: "frontend/src/lib/api.ts", contains: "export const wakeServer" }]
    },
    {
        question: "Do guests need an account?",
        answer: "To join a real meeting, yes: a free account needs only a name, a username and a password, no email. The live demo needs no account at all.",
        evidence: [
            { path: "backend/src/validators/user.schemas.js", contains: "const registerSchema = z.object({" },
            { path: "frontend/src/App.tsx", contains: "<Route path=\"/demo\" element={<DemoPage />} />" }
        ]
    },
    {
        question: "How many people can join?",
        answer: "About six. Video goes straight from each person to everyone else, so every extra person adds an upload stream, and most connections run out of room after about six.",
        evidence: [{ path: "frontend/src/features/room/peerMesh.ts", contains: "new RTCPeerConnection" }]
    },
    {
        question: "Is the recap made by AI?",
        answer: "No. When the host ends the call, the server applies fixed rules to the chat: commitments like “I’ll” or “owns” become action items and recurring phrases become topics. No external AI service is used, and the same chat always gives the same recap.",
        evidence: [{ path: "backend/src/utils/meetingSummary.js", contains: "Deterministic, no external AI" }]
    },
    {
        question: "Where is my data stored?",
        answer: "Your account, meetings, chat messages and recaps are kept in Bridge’s database so they appear in your history; passwords are stored only as hashes. Audio and video are never recorded or stored.",
        evidence: [
            { path: "backend/src/models/meeting.model.js", contains: "activityLogs" },
            { path: "backend/package.json", contains: "bcryptjs" }
        ]
    }
];

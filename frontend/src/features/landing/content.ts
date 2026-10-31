/** Copy and claims for the landing page. Every claim here points at real code or a real test. */

export const E2E_SPEC_PATH = "frontend/tests/e2e/meeting-system.spec.js";

export interface WalkthroughStep {
    id: "start" | "share" | "recap";
    title: string;
    body: string;
    image: { desktop: string; mobile: string; alt: string; desktopHeight: number; mobileHeight: number };
}

export const WALKTHROUGH: WalkthroughStep[] = [
    {
        id: "start",
        title: "Start",
        body: "One click makes a room with a readable code like kmt-vrqp-xhw. The lobby checks your camera and mic, then the invite link is one tap away.",
        image: {
            desktop: "/landing/step-start-desktop.webp",
            mobile: "/landing/step-start-mobile.webp",
            desktopHeight: 1600,
            mobileHeight: 1688,
            alt: "A new Bridge room with only the host, Maya Patel, and the invite link just copied."
        }
    },
    {
        id: "share",
        title: "Share",
        body: "People join from the link in their browser, with nothing to install. Everyone sees who is speaking, who is muted, and the chat as it happens.",
        image: {
            desktop: "/landing/step-share-desktop.webp",
            mobile: "/landing/step-share-mobile.webp",
            desktopHeight: 1600,
            mobileHeight: 1688,
            alt: "The same room with four people. Jordan Lee is muted, and the chat shows messages about the release checklist and Thursday's deadline."
        }
    },
    {
        id: "recap",
        title: "Recap",
        body: "When the host ends the call, the server writes the recap: key points, what happened, topics and the full transcript, saved to everyone's history.",
        image: {
            desktop: "/landing/step-recap-desktop.webp",
            mobile: "/landing/step-recap-mobile.webp",
            desktopHeight: 3050,
            mobileHeight: 4326,
            alt: "The meeting recap: three key points taken from the chat, who was there, topics such as release and onboarding, and the five-message transcript."
        }
    }
];

export const OUTCOMES = [
    {
        title: "Everyone leaves with the same notes.",
        body: "Ending the call produces key points and the full transcript, kept in each person's history and copyable as Markdown."
    },
    {
        title: "A host can remove anyone, and the server enforces it.",
        body: "Removing someone or ending the call is checked by the API, so a participant cannot do it by calling the endpoint directly."
    },
    {
        title: "Join from a link, in a browser, in seconds.",
        body: "No install and no account for the demo. A lobby checks your devices first, and a dropped connection rejoins on its own."
    }
];

export interface EngineeringNote {
    label: string;
    detail: string;
    path: string;
}

export const ENGINEERING: EngineeringNote[] = [
    { label: "WebRTC mesh", detail: "Perfect negotiation with fixed transceivers, so muting, camera and screen share swap tracks without renegotiating.", path: "frontend/src/features/room/peerMesh.ts" },
    { label: "Socket.IO signalling", detail: "Authenticated handshake, relays scoped to one room, and per-socket media state.", path: "backend/src/controllers/socketManager.js" },
    { label: "Sessions", detail: "15-minute access tokens, rotating refresh tokens in httpOnly cookies, a CSRF check on refresh, and sign out of every device.", path: "backend/src/services/auth.service.js" },
    { label: "Reconnects", detail: "Network drops rejoin automatically, and opening a second tab hands over instead of duplicating you.", path: "frontend/src/features/room/useMeetingConnection.ts" },
    { label: "Validation and roles", detail: "Zod-validated routes, and host-only actions checked on the server.", path: "backend/src/validators" },
    { label: "Recap engine", detail: "A deterministic summariser: keyword frequency and sentence scoring over chat and activity. No external AI.", path: "backend/src/utils/meetingSummary.js" }
];

export interface VerifiedFlow {
    flow: string;
    /** Exact title of the Playwright test that covers the flow. */
    test: string;
    /** A line that must exist in the spec, pinning the step inside the test. */
    step: string;
}

const LIFECYCLE = "two people meet, chat, mute, leave, get removed, and the host ends with a recap";
const RETURNING = "a returning user signs in and stays signed in after a reload";

export const VERIFIED: VerifiedFlow[] = [
    { flow: "Register", test: RETURNING, step: 'await page.getByRole("button", { name: "Create account" }).click();' },
    { flow: "Sign in", test: RETURNING, step: 'await page.getByRole("button", { name: "Sign in" }).click();' },
    { flow: "Stay signed in after a reload", test: RETURNING, step: "await page.reload();" },
    { flow: "Create a meeting and join it by link", test: LIFECYCLE, step: "// Guest joins by pasting the full invite link." },
    { flow: "Chat in real time", test: LIFECYCLE, step: "// Chat both ways." },
    { flow: "Only the host can remove people", test: LIFECYCLE, step: "expect(forbidden.status()).toBe(403);" },
    { flow: "End the meeting and open its recap", test: LIFECYCLE, step: "// Host ends the meeting and lands on the recap." },
    { flow: "Outsiders get a 403 on a recap", test: "people outside a meeting cannot read its recap, and unknown codes are explained", step: "expect((await summaryResponse).status()).toBe(403);" }
];

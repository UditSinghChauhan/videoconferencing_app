import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ButtonLink, Button } from "../components/Button";
import { Logo } from "../components/Logo";
import { useToast } from "../components/Toast";
import { DEMO_MEETING_ID, DEMO_OPENING_CHAT, DEMO_PARTICIPANTS, DEMO_REPLIES, type DemoParticipant } from "../features/demo/demoScript";
import { generateMeetingSummary, type ActivityEntry } from "../features/demo/meetingSummary";
import { RecapView } from "../features/meetings/RecapView";
import { Lobby } from "../features/room/Lobby";
import { RoomView } from "../features/room/RoomView";
import type { PersonModel } from "../features/room/SidePanel";
import type { TileModel } from "../features/room/types";
import { useLocalMedia } from "../features/room/useLocalMedia";
import type { ChatMessage, MeetingRecap } from "../lib/types";
import styles from "./DemoPage.module.css";

type Phase = "lobby" | "call" | "ended";

const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)] as T;

export default function DemoPage() {
    const toast = useToast();
    const [phase, setPhase] = useState<Phase>("lobby");
    const [participants, setParticipants] = useState<DemoParticipant[]>(DEMO_PARTICIPANTS);
    const [speakerId, setSpeakerId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [startedAt] = useState(() => Date.now() - 4 * 60_000);
    const [recap, setRecap] = useState<MeetingRecap | null>(null);
    const activity = useRef<ActivityEntry[]>([]);
    const timers = useRef<number[]>([]);
    const nextId = useRef(0);

    // The demo never asks for the camera until the visitor turns it on.
    const media = useLocalMedia({ autoStart: false, onError: (message) => toast.show(message, "error") });

    const addMessage = useCallback((sender: string, text: string, isOwn = false, sentAt = new Date()) => {
        nextId.current += 1;
        activity.current.push({ type: "chat", username: sender, content: text });
        setMessages((current) => [...current, { id: `demo-${nextId.current}`, sender, text, isOwn, sentAt: sentAt.toISOString() }]);
    }, []);

    useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

    // Rotate a simulated active speaker so the speaking ring is visible.
    useEffect(() => {
        if (phase !== "call") return;
        const speakers = participants.filter((p) => p.micOn);
        if (speakers.length === 0) return;

        const interval = window.setInterval(() => {
            setSpeakerId((current) => (Math.random() < 0.25 ? null : pick(speakers.filter((p) => p.id !== current)).id));
        }, 2600);
        return () => window.clearInterval(interval);
    }, [participants, phase]);

    const enterCall = () => {
        setMessages([]);
        setRecap(null);
        activity.current = [
            { type: "join", username: "You", content: "created and joined the meeting" },
            ...participants.map<ActivityEntry>((p) => ({ type: "join", username: p.name, content: "joined the meeting" }))
        ];
        DEMO_OPENING_CHAT.forEach((entry) => addMessage(entry.sender, entry.text, false, new Date(Date.now() - entry.offsetSeconds * 1000)));
        setPhase("call");
    };

    const sendMessage = (text: string) => {
        addMessage("You", text, true);
        const responders = participants.filter((p) => DEMO_REPLIES[p.name]);
        if (responders.length === 0) return;
        const responder = pick(responders);
        const timer = window.setTimeout(() => addMessage(responder.name, pick(DEMO_REPLIES[responder.name] ?? [])), 1200 + Math.random() * 1400);
        timers.current.push(timer);
    };

    const removePerson = (person: PersonModel) => {
        setParticipants((current) => current.filter((p) => p.id !== person.id));
        activity.current.push({ type: "removed", username: person.name, content: "was removed from the meeting" });
        toast.show(`${person.name} was removed from the call.`);
    };

    const tiles = useMemo<TileModel[]>(() => [
        {
            id: "local",
            name: "You",
            isLocal: true,
            isHost: true,
            stream: media.previewStream,
            media: { audio: media.micOn, video: media.cameraOn, screen: media.screenOn }
        },
        ...participants.map<TileModel>((participant) => ({
            id: participant.id,
            name: participant.name,
            isLocal: false,
            stream: null,
            media: { audio: participant.micOn, video: false, screen: false },
            simulatedSpeaking: participant.id === speakerId
        }))
    ], [media.cameraOn, media.micOn, media.previewStream, media.screenOn, participants, speakerId]);

    const people = useMemo<PersonModel[]>(() => [
        { id: "you", name: "You", isHost: true, isYou: true, micOn: media.micOn },
        ...participants.map((p) => ({ id: p.id, name: p.name, isHost: false, isYou: false, micOn: p.micOn }))
    ], [media.micOn, participants]);

    const endCall = () => {
        timers.current.forEach((timer) => window.clearTimeout(timer));
        timers.current = [];
        activity.current.push({ type: "ended", username: "You", content: "ended the meeting" });
        const endedAt = new Date();
        setRecap({
            meetingId: DEMO_MEETING_ID,
            status: "ended",
            hostUsername: "you",
            createdAt: new Date(startedAt).toISOString(),
            endedAt: endedAt.toISOString(),
            durationMs: endedAt.getTime() - startedAt,
            participantCount: participants.length + 1,
            summary: generateMeetingSummary(activity.current, endedAt),
            chat: messages.map((m) => ({ sender: m.sender, content: m.text, sentAt: m.sentAt }))
        });
        media.release();
        setPhase("ended");
    };

    if (phase === "ended" && recap) {
        return (
            <div className={styles.recapPage}>
                <header className={styles.recapTop}>
                    <Logo />
                    <div className={styles.recapActions}>
                        <Button variant="ghost" size="sm" onClick={() => { setParticipants(DEMO_PARTICIPANTS); setPhase("lobby"); }}>
                            Run the demo again
                        </Button>
                        <ButtonLink to="/auth?mode=signup" size="sm">Host a real call</ButtonLink>
                    </div>
                </header>
                <main id="main" className={styles.recapMain}>
                    <RecapView
                        recap={recap}
                        notice="Demo ended. This is the recap Bridge writes when a host ends a call."
                        transcriptOpen
                        footnote="In the demo the recap is built in your browser by the same rules the server uses: keyword frequency and sentence scoring over the chat and activity log. No audio is recorded and no external AI is used."
                    />
                </main>
            </div>
        );
    }

    if (phase === "lobby") {
        return (
            <Lobby
                meetingId={DEMO_MEETING_ID}
                displayName="You"
                previewStream={media.previewStream}
                micOn={media.micOn}
                cameraOn={media.cameraOn}
                micStatus={media.micStatus}
                cameraStatus={media.cameraStatus}
                onToggleMic={media.toggleMic}
                onToggleCamera={media.toggleCamera}
                title="Try a meeting, no account needed"
                description="You'll join a call with three simulated teammates. Turn your camera on if you like: video stays in this browser tab and is never uploaded."
                actions={
                    <>
                        <Button size="lg" onClick={enterCall} data-testid="join-meeting-button">Join demo</Button>
                        <ButtonLink to="/" size="lg" variant="ghost">Back</ButtonLink>
                    </>
                }
            />
        );
    }

    return (
        <RoomView
            meetingId={DEMO_MEETING_ID}
            startedAt={startedAt}
            status="connected"
            isHost
            tiles={tiles}
            people={people}
            messages={messages}
            chatEnabled
            screenShareAllowed
            inviteLink={`${window.location.origin}/demo`}
            media={media}
            banner={
                <div className={styles.banner} role="note">
                    <span><strong>Demo</strong> · Teammates are simulated. Your camera and screen share are real and stay on this device.</span>
                    <ButtonLink to="/auth?mode=signup" size="sm" variant="secondary">Host a real call</ButtonLink>
                </div>
            }
            onSendMessage={sendMessage}
            onRemovePerson={removePerson}
            onLeave={endCall}
        />
    );
}

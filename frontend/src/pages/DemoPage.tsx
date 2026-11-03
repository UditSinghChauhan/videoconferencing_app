import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ButtonLink, Button } from "../components/Button";
import { Logo } from "../components/Logo";
import { useToast } from "../components/Toast";
import { DEMO_MEETING_ID, DEMO_PARTICIPANTS, DEMO_REPLIES, DEMO_SCRIPT, DEMO_SCRIPT_END, type DemoParticipant } from "../features/demo/demoScript";
import { generateMeetingSummary, type ActivityEntry } from "../features/demo/meetingSummary";
import { Avatar as CastAvatar } from "../features/landing/cast/Avatar";
import { castByName } from "../features/landing/cast/people";
import { Face, FaceStack } from "../features/landing/parts/People";
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

const END_HINT = "End the call to see the recap";

/** Owners in the recap wear the same faces as on the landing page. */
const recapAvatar = (name: string) => {
    const member = castByName(name);
    return member ? <Face person={member.id} size={20} /> : undefined;
};
const recapTeam = () => <FaceStack people={DEMO_PARTICIPANTS.map((p) => p.id)} label="Everyone" />;

export default function DemoPage() {
    const toast = useToast();
    const [phase, setPhase] = useState<Phase>("lobby");
    const [participants, setParticipants] = useState<DemoParticipant[]>(DEMO_PARTICIPANTS);
    const [ending, setEnding] = useState(false);
    const [speakerId, setSpeakerId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [scriptDone, setScriptDone] = useState(false);
    // The clock and the recap's date start when the visitor joins, never earlier.
    const [startedAt, setStartedAt] = useState(() => Date.now());
    const [recap, setRecap] = useState<MeetingRecap | null>(null);
    const activity = useRef<ActivityEntry[]>([]);
    const timers = useRef<number[]>([]);
    const nextId = useRef(0);
    // Who is still in the call when a scripted line comes up (the host can remove people mid-script).
    const present = useRef(new Set(DEMO_PARTICIPANTS.map((p) => p.id)));

    // The demo never asks for the camera until the visitor turns it on.
    const media = useLocalMedia({ autoStart: false, onError: (message) => toast.show(message, "error") });

    const addMessage = useCallback((sender: string, text: string, isOwn = false) => {
        nextId.current += 1;
        activity.current.push({ type: "chat", username: sender, content: text });
        setMessages((current) => [...current, { id: `demo-${nextId.current}`, sender, text, isOwn, sentAt: new Date().toISOString() }]);
    }, []);

    const later = useCallback((seconds: number, run: () => void) => {
        timers.current.push(window.setTimeout(run, seconds * 1000));
    }, []);

    const clearTimers = () => {
        timers.current.forEach((timer) => window.clearTimeout(timer));
        timers.current = [];
    };

    useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

    const enterCall = () => {
        clearTimers();
        setMessages([]);
        setRecap(null);
        setSpeakerId(null);
        setScriptDone(false);
        setStartedAt(Date.now());
        present.current = new Set(participants.map((p) => p.id));
        activity.current = [
            { type: "join", username: "You", content: "created and joined the meeting" },
            ...participants.map<ActivityEntry>((p) => ({ type: "join", username: p.name, content: "joined the meeting" }))
        ];
        // The stand-up: each teammate speaks (ring and mouth), then posts what they said.
        for (const line of DEMO_SCRIPT) {
            const person = DEMO_PARTICIPANTS.find((p) => p.id === line.speaker);
            if (!person) continue;
            later(line.start, () => {
                if (present.current.has(person.id)) setSpeakerId(person.id);
            });
            later(line.end, () => {
                setSpeakerId((current) => (current === person.id ? null : current));
                if (present.current.has(person.id)) addMessage(person.name, line.text);
            });
        }
        later(DEMO_SCRIPT_END, () => setScriptDone(true));
        setPhase("call");
    };

    const sendMessage = (text: string) => {
        addMessage("You", text, true);
        const responders = participants.filter((p) => DEMO_REPLIES[p.name]);
        if (responders.length === 0) return;
        const responder = pick(responders);
        // A short spoken reply, then the line in the chat.
        later(0.8, () => setSpeakerId(responder.id));
        later(2.2, () => {
            setSpeakerId((current) => (current === responder.id ? null : current));
            if (present.current.has(responder.id)) addMessage(responder.name, pick(DEMO_REPLIES[responder.name] ?? []));
        });
    };

    const removePerson = (person: PersonModel) => {
        present.current.delete(person.id as DemoParticipant["id"]);
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
            simulatedSpeaking: participant.id === speakerId,
            // The same illustrated cast as the landing page: breathing, blinking, and talking while they speak.
            illustration: (speaking: boolean) => <CastAvatar person={participant.id} speaking={speaking} />
        }))
    ], [media.cameraOn, media.micOn, media.previewStream, media.screenOn, participants, speakerId]);

    const people = useMemo<PersonModel[]>(() => [
        { id: "you", name: "You", isHost: true, isYou: true, micOn: media.micOn },
        ...participants.map((p) => ({ id: p.id, name: p.name, isHost: false, isYou: false, micOn: p.micOn }))
    ], [media.micOn, participants]);

    const endCall = async () => {
        // Let the room fold away before the recap builds in (instant under reduced motion).
        setEnding(true);
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            await new Promise((resolve) => window.setTimeout(resolve, 460));
        }
        setEnding(false);
        clearTimers();
        setSpeakerId(null);
        activity.current.push({ type: "ended", username: "You", content: "ended the meeting" });
        const endedAt = new Date();
        setRecap({
            meetingId: DEMO_MEETING_ID,
            status: "ended",
            hostUsername: "you",
            hostName: "You",
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
                        reveal
                        renderAvatar={recapAvatar}
                        renderTeam={recapTeam}
                        footnote="In the demo the recap is built in your browser by the same rules the server uses: commitments in the chat become action items and recurring phrases become topics. No audio is recorded and no external AI is used."
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
            leaveHint={scriptDone ? END_HINT : null}
            ending={ending}
        />
    );
}

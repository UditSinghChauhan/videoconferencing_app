import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Link2, WifiOff } from "lucide-react";
import { Button } from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import { LogoMark } from "../../components/Logo";
import { formatElapsed } from "../../lib/format";
import type { ChatMessage } from "../../lib/types";
import { ControlBar, type Panel } from "./ControlBar";
import { ChatPanel, PeoplePanel, type PersonModel } from "./SidePanel";
import type { TileModel } from "./types";
import { VideoStage } from "./VideoStage";
import styles from "./RoomView.module.css";

export interface RoomViewProps {
    meetingId: string;
    startedAt: number;
    status: "connected" | "connecting" | "reconnecting";
    isHost: boolean;
    tiles: TileModel[];
    people: PersonModel[];
    messages: ChatMessage[];
    chatEnabled: boolean;
    screenShareAllowed: boolean;
    inviteLink: string;
    media: {
        micOn: boolean;
        cameraOn: boolean;
        screenOn: boolean;
        canShareScreen: boolean;
        toggleMic: () => void;
        toggleCamera: () => void;
        toggleScreenShare: () => void;
    };
    removingId?: string | null;
    banner?: React.ReactNode;
    onSendMessage: (text: string) => void;
    onRemovePerson: (person: PersonModel) => void;
    /** Host: ends the meeting for everyone. Participant: leaves. */
    onLeave: () => Promise<void> | void;
}

function useElapsed(startedAt: number) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const interval = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(interval);
    }, []);

    return formatElapsed(now - startedAt);
}

export function RoomView(props: RoomViewProps) {
    const { media, messages, isHost } = props;
    const [panel, setPanel] = useState<Panel>(null);
    const [seenCount, setSeenCount] = useState(0);
    const [confirmLeave, setConfirmLeave] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [copied, setCopied] = useState(false);
    const elapsed = useElapsed(props.startedAt);
    const mediaRef = useRef(media);
    mediaRef.current = media;

    useEffect(() => {
        if (panel === "chat") {
            setSeenCount(messages.length);
        }
    }, [messages.length, panel]);

    const unread = panel === "chat" ? 0 : messages.slice(seenCount).filter((message) => !message.isOwn).length;

    const togglePanel = useCallback((next: Exclude<Panel, null>) => {
        setPanel((current) => (current === next ? null : next));
    }, []);

    // Meet-style shortcuts. Ignored while typing so chat stays usable.
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest("input, textarea, [contenteditable='true']")) return;
            if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;

            const key = event.key.toLowerCase();
            if (key === "d") {
                event.preventDefault();
                mediaRef.current.toggleMic();
            } else if (key === "e") {
                event.preventDefault();
                mediaRef.current.toggleCamera();
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    const copyInvite = async () => {
        try {
            await navigator.clipboard.writeText(props.inviteLink);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            setPanel("people");
        }
    };

    const leave = async () => {
        setLeaving(true);
        try {
            await props.onLeave();
        } finally {
            setLeaving(false);
            setConfirmLeave(false);
        }
    };

    return (
        <div className={styles.room}>
            <header className={styles.header}>
                <div className={styles.identity}>
                    <LogoMark size={24} />
                    <h1 className={styles.code}>{props.meetingId}</h1>
                    <button type="button" className={styles.copyLink} onClick={copyInvite}>
                        {copied ? <Check size={14} aria-hidden="true" /> : <Link2 size={14} aria-hidden="true" />}
                        <span>{copied ? "Copied" : "Copy invite"}</span>
                    </button>
                </div>
                <div className={styles.status}>
                    {props.status !== "connected" ? (
                        <span className={styles.reconnecting} role="status">
                            <WifiOff size={14} aria-hidden="true" />
                            {props.status === "reconnecting" ? "Reconnecting…" : "Connecting…"}
                        </span>
                    ) : (
                        <span className={styles.live}>
                            <span className={styles.liveDot} aria-hidden="true" />
                            Live
                        </span>
                    )}
                    <time className="tabular" aria-label={`Call duration ${elapsed}`}>{elapsed}</time>
                </div>
            </header>

            {props.banner}

            <main id="main" className={styles.body}>
                <section className={styles.stage} aria-label="Participants' video">
                    <VideoStage tiles={props.tiles} />
                </section>
                {panel === "chat" ? (
                    <ChatPanel messages={messages} onSend={props.onSendMessage} onClose={() => setPanel(null)} disabled={!props.chatEnabled} />
                ) : null}
                {panel === "people" ? (
                    <PeoplePanel
                        people={props.people}
                        inviteLink={props.inviteLink}
                        canRemove={isHost}
                        removingId={props.removingId ?? null}
                        onRemove={props.onRemovePerson}
                        onClose={() => setPanel(null)}
                    />
                ) : null}
            </main>

            <footer className={styles.footer}>
                <ControlBar
                    micOn={media.micOn}
                    cameraOn={media.cameraOn}
                    screenOn={media.screenOn}
                    canShareScreen={media.canShareScreen}
                    screenShareAllowed={props.screenShareAllowed}
                    panel={panel}
                    unread={unread}
                    participantCount={props.people.length}
                    leaveLabel={isHost ? "End" : "Leave"}
                    onToggleMic={media.toggleMic}
                    onToggleCamera={media.toggleCamera}
                    onToggleScreen={media.toggleScreenShare}
                    onTogglePanel={togglePanel}
                    onLeave={() => (isHost ? setConfirmLeave(true) : void leave())}
                />
            </footer>

            <Dialog
                open={confirmLeave}
                tone="dark"
                title="End the meeting for everyone?"
                description="Everyone will be disconnected and Bridge will generate the recap from this call's chat and activity."
                onClose={() => setConfirmLeave(false)}
                actions={
                    <>
                        <Button variant="ghost" onClick={() => setConfirmLeave(false)}>
                            Keep talking
                        </Button>
                        <Button variant="danger" loading={leaving} onClick={leave} data-testid="confirm-end-meeting">
                            End meeting
                        </Button>
                    </>
                }
            />
        </div>
    );
}

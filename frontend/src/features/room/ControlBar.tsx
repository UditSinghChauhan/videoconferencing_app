import type { ReactNode } from "react";
import { MessageSquare, Mic, MicOff, MonitorUp, MonitorX, PhoneOff, Users, Video, VideoOff } from "lucide-react";
import styles from "./ControlBar.module.css";

export type Panel = "chat" | "people" | null;

interface ControlBarProps {
    micOn: boolean;
    cameraOn: boolean;
    screenOn: boolean;
    canShareScreen: boolean;
    screenShareAllowed: boolean;
    panel: Panel;
    unread: number;
    participantCount: number;
    leaveLabel: string;
    onToggleMic: () => void;
    onToggleCamera: () => void;
    onToggleScreen: () => void;
    onTogglePanel: (panel: Exclude<Panel, null>) => void;
    onLeave: () => void;
}

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? "⌘" : "Ctrl";

function ControlButton({
    label,
    shortcut,
    pressed,
    tone = "default",
    onClick,
    children,
    badge
}: {
    label: string;
    shortcut?: string;
    pressed?: boolean;
    tone?: "default" | "off" | "danger";
    onClick: () => void;
    children: ReactNode;
    badge?: number;
}) {
    const tooltip = shortcut ? `${label} (${shortcut})` : label;

    return (
        <button
            type="button"
            className={[styles.control, styles[tone]].join(" ")}
            aria-label={badge ? `${label}, ${badge} unread` : label}
            aria-pressed={pressed}
            aria-keyshortcuts={shortcut?.replace("⌘", "Meta").replace(/\s/g, "")}
            data-tooltip={tooltip}
            onClick={onClick}
        >
            {children}
            {badge ? (
                <span className={styles.badge} aria-hidden="true">
                    {badge > 9 ? "9+" : badge}
                </span>
            ) : null}
        </button>
    );
}

export function ControlBar(props: ControlBarProps) {
    const { micOn, cameraOn, screenOn, panel, unread, participantCount } = props;

    return (
        <div className={styles.bar} role="toolbar" aria-label="Meeting controls">
            <div className={styles.group}>
                <ControlButton
                    label={micOn ? "Turn off microphone" : "Turn on microphone"}
                    shortcut={`${MOD}+D`}
                    tone={micOn ? "default" : "off"}
                    onClick={props.onToggleMic}
                >
                    {micOn ? <Mic size={20} aria-hidden="true" /> : <MicOff size={20} aria-hidden="true" />}
                </ControlButton>
                <ControlButton
                    label={cameraOn ? "Turn off camera" : "Turn on camera"}
                    shortcut={`${MOD}+E`}
                    tone={cameraOn ? "default" : "off"}
                    onClick={props.onToggleCamera}
                >
                    {cameraOn ? <Video size={20} aria-hidden="true" /> : <VideoOff size={20} aria-hidden="true" />}
                </ControlButton>
                {props.canShareScreen && props.screenShareAllowed ? (
                    <span className={styles.desktopOnly}>
                        <ControlButton
                            label={screenOn ? "Stop presenting" : "Present your screen"}
                            pressed={screenOn}
                            onClick={props.onToggleScreen}
                        >
                            {screenOn ? <MonitorX size={20} aria-hidden="true" /> : <MonitorUp size={20} aria-hidden="true" />}
                        </ControlButton>
                    </span>
                ) : null}
            </div>

            <div className={styles.group}>
                <ControlButton
                    label={`People (${participantCount})`}
                    pressed={panel === "people"}
                    onClick={() => props.onTogglePanel("people")}
                >
                    <Users size={20} aria-hidden="true" />
                </ControlButton>
                <ControlButton
                    label="Chat"
                    pressed={panel === "chat"}
                    badge={panel === "chat" ? 0 : unread}
                    onClick={() => props.onTogglePanel("chat")}
                >
                    <MessageSquare size={20} aria-hidden="true" />
                </ControlButton>
                <button type="button" className={styles.leave} onClick={props.onLeave} data-testid="leave-button">
                    <PhoneOff size={18} aria-hidden="true" />
                    <span>{props.leaveLabel}</span>
                </button>
            </div>
        </div>
    );
}

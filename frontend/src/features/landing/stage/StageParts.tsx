/**
 * Room pieces for the landing page's scroll and loop demos, built on the
 * room's own stylesheets (VideoTile, SidePanel, ControlBar), so the demos look
 * exactly like Bridge and their text stays crisp at any zoom. Decorative:
 * the sections that use them carry the meaning in text.
 */
import { forwardRef, type ReactNode } from "react";
import { MessageSquare, Mic, MicOff, MonitorUp, PhoneOff, Users, Video } from "lucide-react";
import controlStyles from "../../room/ControlBar.module.css";
import chatStyles from "../../room/SidePanel.module.css";
import tileStyles from "../../room/VideoTile.module.css";
import { Avatar } from "../cast/Avatar";
import { CAST, type CastId } from "../cast/people";
import type { StandupMessage } from "../fixtures";
import styles from "./StageParts.module.css";

interface CastTileProps {
    person: CastId;
    speaking?: boolean;
    host?: boolean;
    you?: boolean;
    muted?: boolean;
    still?: boolean;
    className?: string;
    children?: ReactNode;
}

/** A Bridge video tile whose camera is a cast member. */
export const CastTile = forwardRef<HTMLDivElement, CastTileProps>(function CastTile(
    { person, speaking = false, host = false, you = false, muted = false, still = false, className, children },
    ref
) {
    const name = CAST[person].name;
    return (
        <div ref={ref} className={[tileStyles.tile, speaking && !muted && tileStyles.speaking, styles.tile, className].filter(Boolean).join(" ")}>
            <Avatar person={person} speaking={speaking && !muted} still={still} />
            <div className={tileStyles.caption}>
                {muted ? <MicOff size={14} className={tileStyles.micOff} aria-hidden="true" /> : null}
                <span className={tileStyles.name}>{you ? `${name} (you)` : name}</span>
                {host ? <span className={tileStyles.host}>Host</span> : null}
            </div>
            {children}
        </div>
    );
});

/** One chat message, in the room's chat styles. */
export function StageMessage({ message, own = false, highlight = false }: { message: StandupMessage; own?: boolean; highlight?: boolean }) {
    return (
        <li className={[chatStyles.message, own && chatStyles.own, styles.message].filter(Boolean).join(" ")}>
            <div className={chatStyles.meta}>
                <strong>{own ? "You" : message.sender}</strong>
                <time>{message.time}</time>
            </div>
            <p className={chatStyles.bubble}>
                {highlight ? <mark className={styles.decision}>{message.text}</mark> : message.text}
            </p>
        </li>
    );
}

/** The room's chat panel frame. */
export function StageChat({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={[chatStyles.panel, styles.chat, className].filter(Boolean).join(" ")}>
            <div className={chatStyles.header}>
                <span className={styles.chatTitle}>Chat</span>
            </div>
            <ol className={chatStyles.messages}>{children}</ol>
        </div>
    );
}

/** The room's control bar, with the End button exposed for animation. */
export function StageControls({ endRef, endClassName, unread = 0 }: { endRef?: React.Ref<HTMLSpanElement>; endClassName?: string; unread?: number }) {
    return (
        <div className={`${controlStyles.bar} ${styles.controls}`}>
            <div className={controlStyles.group}>
                <span className={controlStyles.control}><Mic size={20} aria-hidden="true" /></span>
                <span className={controlStyles.control}><Video size={20} aria-hidden="true" /></span>
                <span className={`${controlStyles.control} ${styles.wideOnly}`}><MonitorUp size={20} aria-hidden="true" /></span>
            </div>
            <div className={controlStyles.group}>
                <span className={`${controlStyles.control} ${styles.wideOnly}`}><Users size={20} aria-hidden="true" /></span>
                <span className={controlStyles.control}>
                    <MessageSquare size={20} aria-hidden="true" />
                    {unread ? <span className={controlStyles.badge}>{unread}</span> : null}
                </span>
                <span ref={endRef} className={[controlStyles.leave, endClassName].filter(Boolean).join(" ")}>
                    <PhoneOff size={18} aria-hidden="true" />
                    <span>End</span>
                </span>
            </div>
        </div>
    );
}

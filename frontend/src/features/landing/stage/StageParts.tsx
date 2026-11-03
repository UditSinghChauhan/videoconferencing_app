/**
 * A room tile for the landing page, built on the room's own VideoTile
 * stylesheet so it looks exactly like Bridge and stays crisp at any zoom.
 * Decorative: the sections that use it carry the meaning in text.
 */
import { forwardRef, type ReactNode } from "react";
import { MicOff } from "lucide-react";
import tileStyles from "../../room/VideoTile.module.css";
import { Avatar } from "../cast/Avatar";
import { CAST, type CastId } from "../cast/people";
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

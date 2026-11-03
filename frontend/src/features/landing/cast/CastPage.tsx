import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Avatar } from "./Avatar";
import { CAST, CAST_ORDER, type CastId } from "./people";
import { useSpeakerTimeline } from "./useSpeakerTimeline";
import styles from "./CastPage.module.css";

declare global {
    interface Window {
        /** Epoch ms of the cast loop's t = 0; read by scripts/render-cast.mjs. */
        __castLoopStart?: number;
    }
}

/**
 * Development only (excluded from production builds in App.tsx).
 * /__cast shows the four cast members animating for review;
 * /__cast?person=maya renders one feed full-frame for scripts/render-cast.mjs.
 */
export default function CastPage() {
    const [params] = useSearchParams();
    const person = params.get("person") as CastId | null;
    const { speaker, loopStart } = useSpeakerTimeline();

    useEffect(() => {
        window.__castLoopStart = loopStart;
    }, [loopStart]);

    if (person && person in CAST) {
        return (
            <div className={styles.single}>
                <Avatar person={person} speaking={speaker === person} label={CAST[person].name} />
            </div>
        );
    }

    return (
        <main className={styles.review}>
            <h1>Demo cast</h1>
            <p>Illustrated stand-ins for call participants. Each speaks in turn on the 12 s loop in <code>cast/timeline.ts</code>.</p>
            <div className={styles.grid}>
                {CAST_ORDER.map((id) => (
                    <figure key={id} className={styles.tile} data-speaking={speaker === id || undefined}>
                        <Avatar person={id} speaking={speaker === id} />
                        <figcaption>{CAST[id].name}{speaker === id ? " · speaking" : ""}</figcaption>
                    </figure>
                ))}
            </div>
            <h2>Still pose (reduced motion)</h2>
            <div className={styles.grid}>
                {CAST_ORDER.map((id) => (
                    <figure key={id} className={styles.tile}>
                        <Avatar person={id} still />
                        <figcaption>{CAST[id].name}</figcaption>
                    </figure>
                ))}
            </div>
        </main>
    );
}

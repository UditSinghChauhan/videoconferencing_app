import { Avatar } from "./Avatar";
import { CAST, CAST_ORDER } from "./people";
import { useSpeakerTimeline } from "./useSpeakerTimeline";
import styles from "./CastPage.module.css";

/**
 * Development only (excluded from production builds in App.tsx).
 * /__cast shows the four cast members animating, and in their still pose, for review.
 */
export default function CastPage() {
    const { speaker } = useSpeakerTimeline();

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

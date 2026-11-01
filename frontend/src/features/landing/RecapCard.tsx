import recapStyles from "../meetings/Recap.module.css";
import { STANDUP_RECAP } from "./fixtures";
import styles from "./RecapCard.module.css";

interface RecapCardProps {
    /** Key points to show (the recap has three). */
    points?: number;
    className?: string;
    /** Hidden from assistive tech when it only illustrates nearby text. */
    decorative?: boolean;
}

/**
 * The recap Bridge writes for the landing stand-up, as a compact card. Content
 * comes from the real summariser (fixtures.ts); key points and topic chips use
 * the recap page's own styles.
 */
export function RecapCard({ points = 3, className, decorative = false }: RecapCardProps) {
    return (
        <article className={[styles.card, className].filter(Boolean).join(" ")} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : "Meeting recap"}>
            <header className={styles.head}>
                <p className={styles.title}>Meeting recap</p>
                <p className={styles.meta}>4 people · 6 min · stand-up</p>
            </header>
            <p className={styles.label}>Key points</p>
            <ol className={`${recapStyles.points} ${styles.points}`}>
                {STANDUP_RECAP.keyPoints.slice(0, points).map((point) => <li key={point}>{point}</li>)}
            </ol>
            <p className={styles.label}>Topics</p>
            <ul className={`${recapStyles.chips} ${styles.chips}`}>
                {STANDUP_RECAP.keywords.map((topic) => <li key={topic}>{topic}</li>)}
            </ul>
        </article>
    );
}

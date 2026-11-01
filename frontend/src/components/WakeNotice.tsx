import styles from "./WakeNotice.module.css";

interface WakeNoticeProps {
    /** Seconds since the request started, or null to render nothing. */
    elapsed: number | null;
}

/** Explains a slow first request on the free-tier API, with a live counter. */
export function WakeNotice({ elapsed }: WakeNoticeProps) {
    return (
        <p className={styles.notice} role="status" aria-live="polite" data-testid="wake-notice">
            {elapsed === null ? null : (
                <>
                    Waking the server. Free hosting sleeps when idle, so the first request can take up to 30 seconds.{" "}
                    <span className={styles.timer} aria-hidden="true">{elapsed}s</span>
                </>
            )}
        </p>
    );
}

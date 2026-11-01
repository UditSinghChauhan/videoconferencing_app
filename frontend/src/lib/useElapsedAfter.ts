import { useEffect, useState } from "react";

/**
 * While `active`, returns whole seconds elapsed once `delayMs` has passed,
 * otherwise null. Used to explain a slow request instead of leaving a blank wait.
 */
export function useElapsedAfter(active: boolean, delayMs = 2000): number | null {
    const [elapsed, setElapsed] = useState<number | null>(null);

    useEffect(() => {
        if (!active) {
            setElapsed(null);
            return;
        }

        const startedAt = Date.now();
        const tick = () => {
            const ms = Date.now() - startedAt;
            setElapsed(ms >= delayMs ? Math.floor(ms / 1000) : null);
        };
        const interval = window.setInterval(tick, 250);
        return () => window.clearInterval(interval);
    }, [active, delayMs]);

    return elapsed;
}

import { useEffect, useRef, useState } from "react";
import type { CastId } from "./people";
import { CAST_TIMELINE, speakerAt, type SpeakerTimeline } from "./timeline";

interface Options {
    timeline?: SpeakerTimeline;
    /** Pause the clock, e.g. off screen or under reduced motion. */
    playing?: boolean;
}

/**
 * Plays a speaker timeline on the wall clock and returns the current speaker.
 * Re-renders only when the speaker changes. `loopStart` is the epoch time of
 * the loop's t = 0 (render-cast.mjs reads it to trim recordings to the loop).
 */
export function useSpeakerTimeline({ timeline = CAST_TIMELINE, playing = true }: Options = {}) {
    const [speaker, setSpeaker] = useState<CastId | null>(null);
    const loopStart = useRef(Date.now());
    const elapsed = useRef(0);

    useEffect(() => {
        if (!playing) return;
        // Resume from where the clock stopped.
        loopStart.current = Date.now() - elapsed.current * 1000;
        const tick = () => {
            elapsed.current = (Date.now() - loopStart.current) / 1000;
            setSpeaker(speakerAt(timeline, elapsed.current));
        };
        tick();
        const timer = window.setInterval(tick, 50);
        return () => window.clearInterval(timer);
    }, [playing, timeline]);

    return { speaker, loopStart: loopStart.current };
}

import type { CastId } from "./people";

export interface SpeakerSegment {
    person: CastId;
    /** Seconds from the start of the loop. */
    start: number;
    end: number;
}

export interface SpeakerTimeline {
    /** Loop length in seconds. */
    duration: number;
    segments: SpeakerSegment[];
}

/**
 * Who speaks when in the 12 s cast loop. The same segments drive the mouth in
 * /__cast recordings and the voiced parts of each person's fake-microphone
 * WAV (scripts/render-cast.mjs), so Bridge's real speaking ring agrees with
 * the face on screen.
 */
export const CAST_TIMELINE: SpeakerTimeline = {
    duration: 12,
    segments: [
        { person: "maya", start: 0.4, end: 2.8 },
        { person: "aarav", start: 3.2, end: 5.6 },
        { person: "sofia", start: 6.0, end: 8.4 },
        { person: "jordan", start: 8.8, end: 10.9 }
    ]
};

/** The speaker at `seconds` into the loop, or null in a pause. */
export const speakerAt = (timeline: SpeakerTimeline, seconds: number): CastId | null => {
    const t = ((seconds % timeline.duration) + timeline.duration) % timeline.duration;
    return timeline.segments.find((segment) => t >= segment.start && t < segment.end)?.person ?? null;
};

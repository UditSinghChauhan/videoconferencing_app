import { useEffect, useState } from "react";

let sharedContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
    if (typeof window === "undefined" || !("AudioContext" in window)) {
        return null;
    }

    sharedContext ??= new AudioContext();
    if (sharedContext.state === "suspended") {
        void sharedContext.resume().catch(() => undefined);
    }
    return sharedContext;
};

const SAMPLE_MS = 120;
const THRESHOLD = 0.035;
const HOLD_MS = 450;

/**
 * True while the audio track carries speech-level signal. One shared
 * AudioContext for the whole room; each track gets a cheap analyser that is
 * sampled ~8 times a second rather than every animation frame.
 */
export function useAudioActivity(track: MediaStreamTrack | null | undefined, enabled = true): boolean {
    const [speaking, setSpeaking] = useState(false);

    useEffect(() => {
        if (!track || !enabled || track.readyState !== "live") {
            setSpeaking(false);
            return;
        }

        const context = getAudioContext();
        if (!context) {
            return;
        }

        let source: MediaStreamAudioSourceNode;
        try {
            source = context.createMediaStreamSource(new MediaStream([track]));
        } catch {
            return;
        }

        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        const samples = new Float32Array(analyser.fftSize);
        let lastLoudAt = 0;

        const interval = window.setInterval(() => {
            analyser.getFloatTimeDomainData(samples);
            let sum = 0;
            for (const sample of samples) sum += sample * sample;
            const rms = Math.sqrt(sum / samples.length);
            const now = performance.now();

            if (rms > THRESHOLD && track.enabled) {
                lastLoudAt = now;
            }

            const next = now - lastLoudAt < HOLD_MS;
            setSpeaking((current) => (current === next ? current : next));
        }, SAMPLE_MS);

        return () => {
            window.clearInterval(interval);
            source.disconnect();
            analyser.disconnect();
            setSpeaking(false);
        };
    }, [track, enabled]);

    return speaking;
}

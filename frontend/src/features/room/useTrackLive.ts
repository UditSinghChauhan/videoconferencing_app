import { useEffect, useState } from "react";

/**
 * Whether the stream currently has an unmuted track of this kind. A remote
 * track goes "muted" when the sender replaces it with null (camera off), so
 * this works even when the server does not relay media state.
 */
export function useTrackLive(stream: MediaStream | null | undefined, kind: "audio" | "video"): MediaStreamTrack | null {
    const [liveTrack, setLiveTrack] = useState<MediaStreamTrack | null>(null);

    useEffect(() => {
        if (!stream) {
            setLiveTrack(null);
            return;
        }

        const evaluate = () => {
            const candidate = stream.getTracks().find((t) => t.kind === kind && t.readyState === "live" && !t.muted) ?? null;
            setLiveTrack(candidate);
        };

        const tracks = new Set<MediaStreamTrack>();
        const watch = () => {
            stream.getTracks().forEach((t) => {
                if (!tracks.has(t)) {
                    tracks.add(t);
                    t.addEventListener("mute", evaluate);
                    t.addEventListener("unmute", evaluate);
                    t.addEventListener("ended", evaluate);
                }
            });
            evaluate();
        };

        watch();
        stream.addEventListener("addtrack", watch);
        stream.addEventListener("removetrack", evaluate);

        return () => {
            stream.removeEventListener("addtrack", watch);
            stream.removeEventListener("removetrack", evaluate);
            tracks.forEach((t) => {
                t.removeEventListener("mute", evaluate);
                t.removeEventListener("unmute", evaluate);
                t.removeEventListener("ended", evaluate);
            });
        };
    }, [stream, kind]);

    return liveTrack;
}

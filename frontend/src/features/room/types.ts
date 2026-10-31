import type { MediaState } from "../../lib/types";

/** Everything a video tile needs, whether the source is WebRTC or the demo. */
export interface TileModel {
    id: string;
    name: string;
    isLocal: boolean;
    isHost?: boolean;
    stream: MediaStream | null;
    /** Null when unknown; tiles then trust the track's own mute state. */
    media: MediaState | null;
    connecting?: boolean;
    /** Demo only: simulated speaking state for tiles without audio. */
    simulatedSpeaking?: boolean;
}

import { memo, useEffect, useRef } from "react";
import { MicOff, MonitorUp } from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { Spinner } from "../../components/Spinner";
import type { TileModel } from "./types";
import { useAudioActivity } from "./useAudioActivity";
import { useTrackLive } from "./useTrackLive";
import styles from "./VideoTile.module.css";

interface VideoTileProps {
    tile: TileModel;
    width?: number;
    height?: number;
    variant?: "grid" | "spotlight" | "strip";
}

export const VideoTile = memo(function VideoTile({ tile, width, height, variant = "grid" }: VideoTileProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const videoTrack = useTrackLive(tile.stream, "video");
    const audioTrack = useTrackLive(tile.stream, "audio");

    const presenting = tile.media?.screen === true;
    const videoWanted = tile.media ? tile.media.video || tile.media.screen : true;
    const showVideo = Boolean(videoTrack) && videoWanted;
    const micOff = tile.media ? !tile.media.audio : false;
    const detectedSpeaking = useAudioActivity(audioTrack, !micOff);
    const speaking = tile.simulatedSpeaking ?? detectedSpeaking;

    useEffect(() => {
        const element = videoRef.current;

        if (element && element.srcObject !== tile.stream) {
            element.srcObject = tile.stream;
        }
    }, [tile.stream]);

    const label = tile.isLocal && tile.name !== "You" ? `${tile.name} (you)` : tile.name;

    return (
        <figure
            className={[styles.tile, styles[variant], speaking && !micOff && styles.speaking].filter(Boolean).join(" ")}
            style={width && height ? { width, height } : undefined}
            aria-label={`${label}${micOff ? ", muted" : ""}${presenting ? ", presenting" : ""}`}
            data-testid="video-tile"
        >
            {/* Remote audio plays through the video element, so it stays mounted even when hidden. */}
            <video
                ref={videoRef}
                className={[
                    styles.video,
                    !showVideo && styles.hidden,
                    presenting && styles.contain,
                    tile.isLocal && !presenting && styles.mirrored
                ].filter(Boolean).join(" ")}
                autoPlay
                playsInline
                muted={tile.isLocal}
            />

            {!showVideo ? (
                <div className={styles.placeholder}>
                    <Avatar name={tile.name} size={variant === "strip" ? 40 : 72} />
                </div>
            ) : null}

            {tile.connecting ? (
                <div className={styles.connecting}>
                    <Spinner size={16} />
                    <span>Connecting…</span>
                </div>
            ) : null}

            <figcaption className={styles.caption}>
                {micOff ? <MicOff size={14} className={styles.micOff} aria-hidden="true" /> : null}
                {presenting ? <MonitorUp size={14} aria-hidden="true" /> : null}
                <span className={styles.name} data-testid="participant-label">{label}</span>
                {tile.isHost ? <span className={styles.host}>Host</span> : null}
            </figcaption>
        </figure>
    );
});

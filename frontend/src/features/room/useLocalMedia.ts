import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OutgoingTracks } from "./peerMesh";

export type DeviceStatus = "idle" | "pending" | "ready" | "blocked" | "missing";

export interface LocalMedia {
    /** Stream for the local preview (video only, so it never echoes). */
    previewStream: MediaStream | null;
    outgoing: OutgoingTracks;
    micOn: boolean;
    cameraOn: boolean;
    screenOn: boolean;
    micStatus: DeviceStatus;
    cameraStatus: DeviceStatus;
    canShareScreen: boolean;
    toggleMic: () => Promise<void>;
    toggleCamera: () => Promise<void>;
    toggleScreenShare: () => Promise<void>;
    release: () => void;
}

const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 24, max: 30 }
};

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
};

const statusFromError = (error: unknown): DeviceStatus => {
    const name = error instanceof DOMException ? error.name : "";
    return name === "NotFoundError" || name === "OverconstrainedError" ? "missing" : "blocked";
};

const hasMediaDevices = () => typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

/**
 * Owns the user's microphone, camera and screen-share tracks.
 *
 * - Mic mute flips `track.enabled`: instant, no device re-open, no renegotiation.
 * - Camera off stops the track so the hardware light turns off.
 * - Screen share takes over the outgoing video slot; the camera resumes after.
 */
interface Options {
    onError?: (message: string) => void;
    /** When false, nothing is requested until the user turns a device on. */
    autoStart?: boolean;
}

export function useLocalMedia({ onError, autoStart = true }: Options = {}): LocalMedia {
    const [audioTrack, setAudioTrack] = useState<MediaStreamTrack | null>(null);
    const [cameraTrack, setCameraTrack] = useState<MediaStreamTrack | null>(null);
    const [screenTrack, setScreenTrack] = useState<MediaStreamTrack | null>(null);
    const [micOn, setMicOn] = useState(false);
    const [micStatus, setMicStatus] = useState<DeviceStatus>(autoStart ? "pending" : "idle");
    const [cameraStatus, setCameraStatus] = useState<DeviceStatus>(autoStart ? "pending" : "idle");
    const tracksRef = useRef<Set<MediaStreamTrack>>(new Set());
    const onErrorRef = useRef(onError);
    onErrorRef.current = onError;

    const track = useCallback((next: MediaStreamTrack) => {
        tracksRef.current.add(next);
        return next;
    }, []);

    const stopTrack = useCallback((target: MediaStreamTrack | null) => {
        if (target) {
            target.stop();
            tracksRef.current.delete(target);
        }
    }, []);

    // Initial acquisition. Asks for both devices in one prompt, then falls
    // back to each device alone so one blocked device does not block the other.
    useEffect(() => {
        let cancelled = false;

        if (!autoStart) {
            return;
        }

        if (!hasMediaDevices()) {
            setMicStatus("missing");
            setCameraStatus("missing");
            return;
        }

        const adopt = (stream: MediaStream) => {
            if (cancelled) {
                stream.getTracks().forEach((t) => t.stop());
                return;
            }

            const [audio] = stream.getAudioTracks();
            const [video] = stream.getVideoTracks();

            if (audio) {
                setAudioTrack(track(audio));
                setMicOn(true);
                setMicStatus("ready");
            }

            if (video) {
                setCameraTrack(track(video));
                setCameraStatus("ready");
            }
        };

        const acquire = async () => {
            try {
                adopt(await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS, video: VIDEO_CONSTRAINTS }));
                return;
            } catch {
                // Fall through to per-device requests.
            }

            try {
                adopt(await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS }));
            } catch (error) {
                if (!cancelled) setMicStatus(statusFromError(error));
            }

            try {
                adopt(await navigator.mediaDevices.getUserMedia({ video: VIDEO_CONSTRAINTS }));
            } catch (error) {
                if (!cancelled) setCameraStatus(statusFromError(error));
            }
        };

        void acquire();

        return () => {
            cancelled = true;
        };
    }, [autoStart, track]);

    // Release every device when the owner unmounts (leaving the room page).
    useEffect(() => {
        const tracks = tracksRef.current;
        return () => {
            tracks.forEach((t) => t.stop());
            tracks.clear();
        };
    }, []);

    useEffect(() => {
        if (audioTrack) {
            audioTrack.enabled = micOn;
        }
    }, [audioTrack, micOn]);

    const toggleMic = useCallback(async () => {
        if (audioTrack) {
            setMicOn((on) => !on);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS });
            const [audio] = stream.getAudioTracks();

            if (audio) {
                setAudioTrack(track(audio));
                setMicOn(true);
                setMicStatus("ready");
            }
        } catch (error) {
            setMicStatus(statusFromError(error));
            onErrorRef.current?.("Bridge can't use your microphone. Allow access in the browser's site settings.");
        }
    }, [audioTrack, track]);

    const toggleCamera = useCallback(async () => {
        if (cameraTrack) {
            stopTrack(cameraTrack);
            setCameraTrack(null);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: VIDEO_CONSTRAINTS });
            const [video] = stream.getVideoTracks();

            if (video) {
                video.onended = () => setCameraTrack((current) => (current === video ? null : current));
                setCameraTrack(track(video));
                setCameraStatus("ready");
            }
        } catch (error) {
            setCameraStatus(statusFromError(error));
            onErrorRef.current?.("Bridge can't use your camera. Allow access in the browser's site settings.");
        }
    }, [cameraTrack, stopTrack, track]);

    const canShareScreen = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getDisplayMedia);

    const toggleScreenShare = useCallback(async () => {
        if (screenTrack) {
            stopTrack(screenTrack);
            setScreenTrack(null);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 15 } }, audio: false });
            const [video] = stream.getVideoTracks();

            if (!video) {
                return;
            }

            video.contentHint = "detail";
            // The browser's own "Stop sharing" button ends the track directly.
            video.onended = () => {
                tracksRef.current.delete(video);
                setScreenTrack((current) => (current === video ? null : current));
            };
            setScreenTrack(track(video));
        } catch (error) {
            // Dismissing the picker is a choice, not an error.
            if (!(error instanceof DOMException && error.name === "NotAllowedError")) {
                onErrorRef.current?.("Screen sharing could not start.");
            }
        }
    }, [screenTrack, stopTrack, track]);

    const release = useCallback(() => {
        tracksRef.current.forEach((t) => t.stop());
        tracksRef.current.clear();
        setAudioTrack(null);
        setCameraTrack(null);
        setScreenTrack(null);
    }, []);

    const outgoingVideo = screenTrack ?? cameraTrack;
    const outgoing = useMemo<OutgoingTracks>(() => ({ audio: audioTrack, video: outgoingVideo }), [audioTrack, outgoingVideo]);
    const previewStream = useMemo(() => (outgoingVideo ? new MediaStream([outgoingVideo]) : null), [outgoingVideo]);

    return {
        previewStream,
        outgoing,
        micOn: Boolean(audioTrack) && micOn,
        cameraOn: Boolean(cameraTrack),
        screenOn: Boolean(screenTrack),
        micStatus,
        cameraStatus,
        canShareScreen,
        toggleMic,
        toggleCamera,
        toggleScreenShare,
        release
    };
}

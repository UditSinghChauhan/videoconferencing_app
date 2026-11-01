import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../../lib/usePrefersReducedMotion";
import { AppFrame } from "./AppFrame";
import { RecapCard } from "./RecapCard";
import styles from "./HeroRecording.module.css";

const DESCRIPTION =
    "Recording of a Bridge call with four illustrated participants. The speaking ring moves between them, two chat messages arrive, the host presses End, the room folds away and the recap builds in with key points and topics.";

const SOURCES = {
    desktop: { mp4: "/landing/hero.mp4", webm: "/landing/hero.webm", poster: "/landing/hero-poster.webp", width: 1920, height: 1200 },
    phone: { mp4: "/landing/hero-phone.mp4", webm: "/landing/hero-phone.webm", poster: "/landing/hero-phone-poster.webp", width: 720, height: 1440 }
} as const;

/**
 * The hero loop: a recording of the running app. Muted, inline, paused off
 * screen, with a visible pause control that never covers the recording. Under
 * reduced motion it becomes a still: the call's four faces with the recap card
 * beside it, so the outcome is still visible.
 */
export function HeroRecording({ variant }: { variant: "desktop" | "phone" }) {
    const reducedMotion = usePrefersReducedMotion();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [paused, setPaused] = useState(false);
    const pausedByVisitor = useRef(false);
    const source = SOURCES[variant];

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const play = () => {
            video.play().then(() => setPaused(false)).catch((error: unknown) => {
                // Autoplay can be refused (data saver, low power mode); the poster stays and the button offers play.
                console.warn("Hero recording did not autoplay", error instanceof Error ? error.message : error);
                setPaused(true);
            });
        };

        const observer = new IntersectionObserver(([entry]) => {
            if (!entry) return;
            if (entry.isIntersecting && !pausedByVisitor.current) play();
            else video.pause();
        }, { threshold: 0.2 });

        observer.observe(video);
        return () => observer.disconnect();
    }, [reducedMotion, variant]);

    const toggle = () => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            pausedByVisitor.current = false;
            void video.play().then(() => setPaused(false)).catch((error: unknown) => {
                console.warn("Hero recording could not play", error);
            });
        } else {
            pausedByVisitor.current = true;
            video.pause();
            setPaused(true);
        }
    };

    const control = (
        <button type="button" className={styles.toggle} onClick={toggle} aria-pressed={paused}>
            {paused ? "Play" : "Pause"}
            <span className="visually-hidden"> recording</span>
        </button>
    );

    if (reducedMotion) {
        const still = (
            <img
                className={styles.media}
                src={source.poster}
                width={source.width}
                height={source.height}
                alt="A Bridge call: Maya Patel, Aarav Mehta, Sofia Rossi and Jordan Lee, drawn as an illustrated demo cast, each in their own room."
                fetchPriority="high"
            />
        );
        return (
            <div className={styles.stillPair} data-variant={variant}>
                {variant === "desktop" ? <AppFrame address="bridgefrontend.onrender.com">{still}</AppFrame> : <div className={styles.phone}>{still}</div>}
                <RecapCard className={styles.stillRecap} />
            </div>
        );
    }

    const video = (
        <video
            ref={videoRef}
            className={styles.media}
            width={source.width}
            height={source.height}
            poster={source.poster}
            muted
            loop
            playsInline
            preload="metadata"
            aria-label={DESCRIPTION}
            onPlay={() => setPaused(false)}
        >
            {/* H.264 first: every current browser plays it. */}
            <source src={source.mp4} type="video/mp4" />
            <source src={source.webm} type="video/webm" />
        </video>
    );

    if (variant === "phone") {
        return (
            <div className={styles.phoneWrap}>
                <div className={styles.phone}>{video}</div>
                <div className={styles.phoneControl}>{control}</div>
            </div>
        );
    }

    return <AppFrame address="bridgefrontend.onrender.com" controls={control}>{video}</AppFrame>;
}

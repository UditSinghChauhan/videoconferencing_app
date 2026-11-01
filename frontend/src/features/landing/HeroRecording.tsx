import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../../lib/usePrefersReducedMotion";
import { AppFrame } from "./AppFrame";
import styles from "./HeroRecording.module.css";

const POSTER = "/landing/hero-poster.webp";
const DESCRIPTION =
    "Recording of a Bridge call: four people chat about a release, the host ends the meeting, and the recap appears with key points and the transcript.";

/**
 * The hero's 20 s muted loop, in its app window. The pause control sits in the
 * window bar so it never covers the recording (the End button is bottom right). Reduced motion shows the finished recap as a
 * still instead; the loop pauses off screen and has a visible pause control.
 */
export function HeroRecording({ address }: { address: string }) {
    const reducedMotion = usePrefersReducedMotion();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [paused, setPaused] = useState(false);
    const pausedByVisitor = useRef(false);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const play = () => {
            video.play().catch((error: unknown) => {
                // Autoplay can be refused (data saver, low power mode); the poster stays and the button offers play.
                console.warn("Hero recording did not autoplay", error instanceof Error ? error.message : error);
                setPaused(true);
            });
        };

        const observer = new IntersectionObserver(([entry]) => {
            if (!entry) return;
            if (entry.isIntersecting && !pausedByVisitor.current) play();
            else video.pause();
        }, { threshold: 0.25 });

        observer.observe(video);
        return () => observer.disconnect();
    }, [reducedMotion]);

    if (reducedMotion) {
        return (
            <AppFrame address={address}>
                <img className={styles.media} src={POSTER} width={2560} height={1600} alt="The finished recap of a Bridge call: key points, who was there and the transcript." fetchPriority="high" />
            </AppFrame>
        );
    }

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

    return (
        <AppFrame address={address} controls={control}>
            <video
                ref={videoRef}
                className={styles.media}
                width={1920}
                height={1200}
                poster={POSTER}
                muted
                loop
                playsInline
                preload="metadata"
                aria-label={DESCRIPTION}
                onPlay={() => setPaused(false)}
            >
                {/* H.264 first: smaller than the VP9 file at this size, and every current browser plays it. */}
                <source src="/landing/hero.mp4" type="video/mp4" />
                <source src="/landing/hero.webm" type="video/webm" />
            </video>
        </AppFrame>
    );
}

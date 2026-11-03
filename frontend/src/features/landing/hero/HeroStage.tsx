import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "../../../lib/usePrefersReducedMotion";
import { HeroRecording } from "../HeroRecording";
import { useMediaQuery } from "../useMediaQuery";
import styles from "./HeroStage.module.css";

/**
 * The hero's product frame, up to 1200 px, in a warm pool of light. As it rises
 * to the middle of the viewport it settles from 0.92 to full size and its
 * corners tighten from 20 to 12 px. Native scroll, one rAF-throttled listener
 * writing two styles (no animation library in the first paint). Phones get a
 * portrait recording in a phone outline instead.
 */
export function HeroStage() {
    const phone = useMediaQuery("(max-width: 639px)");
    const reduced = usePrefersReducedMotion();
    const stage = useRef<HTMLDivElement>(null);
    const frame = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = frame.current;
        const container = stage.current;
        if (!element || !container) return;
        if (reduced || phone) {
            element.style.transform = "";
            element.style.setProperty("--frame-radius", "12px");
            return;
        }
        let raf = 0;
        const update = () => {
            raf = 0;
            const rect = container.getBoundingClientRect();
            const viewport = window.innerHeight;
            // 0 when the frame's top meets the bottom of the viewport, 1 when its centre meets the centre.
            const start = rect.top - viewport;
            const end = rect.top + rect.height / 2 - viewport / 2;
            const progress = Math.min(1, Math.max(0, start / (start - end)));
            element.style.transform = `scale(${0.92 + 0.08 * progress})`;
            element.style.setProperty("--frame-radius", `${20 - 8 * progress}px`);
        };
        const schedule = () => {
            if (!raf) raf = window.requestAnimationFrame(update);
        };
        update();
        window.addEventListener("scroll", schedule, { passive: true });
        window.addEventListener("resize", schedule);
        return () => {
            window.removeEventListener("scroll", schedule);
            window.removeEventListener("resize", schedule);
            if (raf) window.cancelAnimationFrame(raf);
        };
    }, [phone, reduced]);

    return (
        <div ref={stage} className={styles.stage}>
            <div className={styles.light} aria-hidden="true" />
            <div ref={frame} className={styles.frame}>
                <HeroRecording variant={phone ? "phone" : "desktop"} />
            </div>
        </div>
    );
}

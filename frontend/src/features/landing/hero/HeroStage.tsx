import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { HeroRecording } from "../HeroRecording";
import { useMediaQuery } from "../useMediaQuery";
import styles from "./HeroStage.module.css";

/**
 * The hero's product frame, up to 1200 px, in a warm pool of light. As it rises
 * to the middle of the viewport it settles from 0.92 to full size and its
 * corners tighten from 20 to 12 px (native scroll, read with useScroll).
 * Phones get a portrait recording in a phone outline instead.
 */
export function HeroStage() {
    const phone = useMediaQuery("(max-width: 639px)");
    const reduced = useReducedMotion();
    const ref = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
    const scale = useTransform(scrollYProgress, [0, 1], [0.92, 1]);
    const radius = useTransform(scrollYProgress, [0, 1], ["20px", "12px"]);

    return (
        <div ref={ref} className={styles.stage}>
            <div className={styles.light} aria-hidden="true" />
            <motion.div
                className={styles.frame}
                style={reduced || phone ? { ["--frame-radius" as string]: "12px" } : { scale, ["--frame-radius" as string]: radius }}
            >
                <HeroRecording variant={phone ? "phone" : "desktop"} />
            </motion.div>
        </div>
    );
}

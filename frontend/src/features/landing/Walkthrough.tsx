import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useSpring, useTransform, type MotionValue } from "motion/react";
import { AppFrame } from "./AppFrame";
import { CAPTURE_WIDTH, WALKTHROUGH, type Crop } from "./content";
import { useMediaQuery } from "./useMediaQuery";
import { useTrackProgress } from "./useTrackProgress";
import styles from "./Walkthrough.module.css";

/** Pane aspect ratio (height / width), matching the 16:10 captures. */
const PANE_RATIO = 10 / 16;
/** A 600 ms spring with no bounce: the camera eases between framings. */
const CAMERA = { duration: 0.6, bounce: 0 };

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
const cropAt = (from: Crop, to: Crop, t: number): Crop => ({ x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t), width: lerp(from.width, to.width, t) });

/**
 * Start, Share, Recap. Steps scroll normally on the left (each about 60vh,
 * copy centred); the sticky pane on the right is a camera over one large
 * capture per step: as you scroll it pans and zooms from the step's first
 * framing to its last, with a 600 ms spring between them. Below 1024 px the
 * steps stack, each with its own capture.
 */
export default function Walkthrough() {
    const wide = useMediaQuery("(min-width: 1024px)");
    return wide ? <CameraWalkthrough /> : <StackedWalkthrough />;
}

function CameraWalkthrough() {
    const ref = useRef<HTMLOListElement>(null);
    const reduced = useReducedMotion();
    const progress = useTrackProgress(ref);
    const [active, setActive] = useState(0);

    const steps = WALKTHROUGH.length;
    const items = useRef<(HTMLLIElement | null)[]>([]);
    /**
     * The step whose band holds the reading line (55 % down the viewport), and
     * how far through that band the line is: the camera's position in that step.
     */
    const local = () => {
        const line = window.innerHeight * 0.55;
        let index = 0;
        let t = 0;
        items.current.forEach((item, i) => {
            if (!item) return;
            const { top, height } = item.getBoundingClientRect();
            if (top <= line) {
                index = i;
                t = Math.min(1, Math.max(0, (line - top) / height));
            }
        });
        return { index, t };
    };

    const x = useSpring(WALKTHROUGH[0]?.camera.from.x ?? 0, CAMERA);
    const y = useSpring(WALKTHROUGH[0]?.camera.from.y ?? 0, CAMERA);
    const width = useSpring(WALKTHROUGH[0]?.camera.from.width ?? CAPTURE_WIDTH, CAMERA);

    useMotionValueEvent(progress, "change", () => {
        const { index, t } = local();
        setActive(index);
        const step = WALKTHROUGH[index];
        if (!step) return;
        const crop = reduced ? step.camera.from : cropAt(step.camera.from, step.camera.to, t);
        if (reduced) {
            x.jump(crop.x);
            y.jump(crop.y);
            width.jump(crop.width);
        } else {
            x.set(crop.x);
            y.set(crop.y);
            width.set(crop.width);
        }
    });

    const fill = useTransform(progress, [0, 1], [0, 1]);

    return (
        <div className={styles.layout}>
            <ol ref={ref} className={styles.steps}>
                {WALKTHROUGH.map((step, index) => (
                    <li key={step.id} ref={(element) => { items.current[index] = element; }} className={styles.step} data-active={index === active || undefined} aria-current={index === active ? "step" : undefined}>
                        <div className={styles.stepCopy}>
                            <h3 className={styles.title}>{step.title}</h3>
                            <p className={styles.body}>{step.body}</p>
                        </div>
                    </li>
                ))}
            </ol>

            <div className={styles.paneColumn}>
                <div className={styles.progress} aria-hidden="true">
                    <span className={styles.count}>{String(active + 1).padStart(2, "0")} / {String(steps).padStart(2, "0")}</span>
                    <span className={styles.rail}><motion.span className={styles.fill} style={{ scaleX: fill }} /></span>
                </div>
                <AppFrame address="bridgefrontend.onrender.com" className={styles.pane}>
                    <div className={styles.viewport} style={{ aspectRatio: `${1 / PANE_RATIO}` }}>
                        {WALKTHROUGH.map((step, index) => (
                            <Shot key={step.id} index={index} active={active} x={x} y={y} width={width} />
                        ))}
                    </div>
                </AppFrame>
            </div>
        </div>
    );
}

function Shot({ index, active, x, y, width }: { index: number; active: number; x: MotionValue<number>; y: MotionValue<number>; width: MotionValue<number> }) {
    const step = WALKTHROUGH[index];
    const captureHeight = step ? step.image.desktopHeight / 2 : 800;
    // translate % refers to the image's own (unscaled) box, which is the pane's width.
    const transform = useTransform([x, y, width], ([cx, cy, cw]: number[]) => {
        const scale = CAPTURE_WIDTH / (cw ?? CAPTURE_WIDTH);
        const tx = -((cx ?? 0) / CAPTURE_WIDTH) * scale * 100;
        const ty = -((cy ?? 0) / captureHeight) * scale * 100;
        return `translate(${tx}%, ${ty}%) scale(${scale})`;
    });
    if (!step) return null;
    return (
        <motion.img
            className={styles.paneShot}
            style={{ transform }}
            data-active={index === active || undefined}
            src={step.image.desktop}
            width={2560}
            height={step.image.desktopHeight}
            alt={step.image.alt}
            aria-hidden={index !== active || undefined}
            loading="lazy"
            decoding="async"
        />
    );
}

/** Under 1024 px: each step is its text followed by its own capture. */
function StackedWalkthrough() {
    return (
        <ol className={styles.stacked}>
            {WALKTHROUGH.map((step, index) => (
                <li key={step.id} className={styles.stackedStep}>
                    <span className={styles.count}>{String(index + 1).padStart(2, "0")} / {String(WALKTHROUGH.length).padStart(2, "0")}</span>
                    <h3 className={styles.title}>{step.title}</h3>
                    <p className={styles.body}>{step.body}</p>
                    <div className={styles.inlineShot} data-step={step.id}>
                        <picture>
                            <source media="(min-width: 640px)" srcSet={step.image.desktop} width={2560} height={step.image.desktopHeight} />
                            <img src={step.image.mobile} width={780} height={step.image.mobileHeight} alt={step.image.alt} loading="lazy" decoding="async" />
                        </picture>
                    </div>
                </li>
            ))}
        </ol>
    );
}

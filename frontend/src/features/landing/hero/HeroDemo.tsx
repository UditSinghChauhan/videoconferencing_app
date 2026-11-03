import { useEffect, useRef, useState } from "react";
import { MessageSquare, Mic, MonitorUp, PhoneOff, Users, Video } from "lucide-react";
import { LogoMark } from "../../../components/Logo";
import { usePrefersReducedMotion } from "../../../lib/usePrefersReducedMotion";
import type { CastId } from "../cast/people";
import { MEETING_CODE, STANDUP_RECAP } from "../fixtures";
import { OwnerChip } from "../parts/People";
import { CastTile } from "../stage/StageParts";
import styles from "./HeroDemo.module.css";

type Phase = "talk" | "end" | "recap" | "reset";

const LOOP_MS = 8000;
const GRID: CastId[] = ["maya", "aarav", "sofia", "jordan"];

/**
 * The loop, in ms: three people speak in turn, End is pressed, the call dims
 * while the recap rises and writes in, it holds, then everything resets.
 */
interface Step {
    at: number;
    phase: Phase;
    speaker: CastId | null;
}

const FIRST: Step = { at: 0, phase: "talk", speaker: "maya" };

const TIMELINE: Step[] = [
    FIRST,
    { at: 1300, phase: "talk", speaker: "aarav" },
    { at: 2600, phase: "talk", speaker: "sofia" },
    { at: 3700, phase: "end", speaker: null },
    { at: 4100, phase: "recap", speaker: null },
    { at: 7500, phase: "reset", speaker: null }
];

const stateAt = (ms: number) => {
    const t = ms % LOOP_MS;
    return [...TIMELINE].reverse().find((step) => t >= step.at) ?? FIRST;
};

/** Runs the loop while the hero is on screen and the tab is visible. Re-renders only on a change of step. */
function useLoop(paused: boolean) {
    const ref = useRef<HTMLDivElement>(null);
    const [step, setStep] = useState<Step>(FIRST);

    useEffect(() => {
        if (paused) return;
        const element = ref.current;
        let visible = true;
        let elapsed = 0;
        let last = performance.now();
        const observer = new IntersectionObserver(([entry]) => {
            visible = Boolean(entry?.isIntersecting);
        });
        if (element) observer.observe(element);

        const timer = window.setInterval(() => {
            const now = performance.now();
            if (visible && document.visibilityState === "visible") elapsed += now - last;
            last = now;
            const next = stateAt(elapsed);
            setStep((current) => (current.at === next.at ? current : next));
        }, 100);

        return () => {
            window.clearInterval(timer);
            observer.disconnect();
        };
    }, [paused]);

    return { ref, step };
}

/**
 * The hero's one composition: a light app window holding the dark call, with
 * the recap card overlapping its lower right edge. Everything is DOM (the
 * room's own tile and control styles, the illustrated cast), so it is sharp
 * at any size. Under reduced motion it holds the finished state.
 */
export function HeroDemo() {
    const reduced = usePrefersReducedMotion();
    const { ref, step } = useLoop(reduced);
    const phase: Phase = reduced ? "recap" : step.phase;
    const speaker = reduced ? null : step.speaker;
    const items = (STANDUP_RECAP.actionItems ?? []).slice(0, 2);

    return (
        <div ref={ref} className={styles.stage} data-phase={phase} aria-hidden="true">
            <div className={styles.window}>
                <div className={styles.chrome}>
                    <span className={styles.room}>
                        <LogoMark size={20} />
                        <span className={styles.code}>{MEETING_CODE}</span>
                    </span>
                    <span className={styles.live}>
                        <span className={styles.dot} />
                        Live
                        <span className={styles.timer}>17:52</span>
                    </span>
                </div>
                <div className={styles.call}>
                    <div className={styles.grid}>
                        {GRID.map((person) => (
                            <CastTile key={person} person={person} speaking={speaker === person} still={reduced} className={styles.tile} />
                        ))}
                    </div>
                    <div className={styles.controls}>
                        <span className={styles.control}><Mic size={18} /></span>
                        <span className={styles.control}><Video size={18} /></span>
                        <span className={`${styles.control} ${styles.wide}`}><MonitorUp size={18} /></span>
                        <span className={styles.spacer} />
                        <span className={`${styles.control} ${styles.wide}`}><Users size={18} /></span>
                        <span className={styles.control}><MessageSquare size={18} /></span>
                        <span className={styles.end}><PhoneOff size={16} /> End</span>
                    </div>
                </div>
            </div>

            <div className={styles.recap}>
                <div className={styles.recapHead}>
                    <span>Meeting recap</span>
                    <span className={styles.recapMeta}>18 min · 4 people</span>
                </div>
                <div className={styles.recapBody}>
                    <p className={styles.summary}>{STANDUP_RECAP.conclusion}</p>
                    <p className={styles.itemsLabel}>Action items</p>
                    <ul className={styles.items}>
                        {items.map((item) => (
                            <li key={item.task}>
                                <span className={styles.box} />
                                <span className={styles.task}>{item.task}</span>
                                <OwnerChip name={item.owner} />
                                {item.due ? <span className={styles.due}>{item.due}</span> : null}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";

/** Loops stop after this many cycles and hold their final state (WCAG 2.2.2: no endless motion). */
const MAX_CYCLES = 3;

/**
 * Steps through a micro-demo's states on a timer while it is on screen.
 * Off screen it pauses; after three cycles, and under reduced motion, it
 * holds the final state. `durations` is how long each step lasts, in ms.
 */
export function useLoop<T extends HTMLElement>(durations: number[]) {
    const ref = useRef<T>(null);
    const inView = useInView(ref, { margin: "-10% 0px" });
    const reduced = useReducedMotion();
    const last = durations.length - 1;
    const [step, setStep] = useState(0);
    const cycles = useRef(0);

    useEffect(() => {
        if (reduced || !inView || cycles.current >= MAX_CYCLES) return;
        const timer = window.setTimeout(() => {
            if (step === last) {
                cycles.current += 1;
                if (cycles.current >= MAX_CYCLES) return;
            }
            setStep((current) => (current + 1) % durations.length);
        }, durations[step] ?? 1000);
        return () => window.clearTimeout(timer);
    }, [durations, inView, last, reduced, step]);

    return { ref, step: reduced ? last : step, reduced: Boolean(reduced) };
}

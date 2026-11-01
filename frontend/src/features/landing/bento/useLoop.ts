import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";

/**
 * Steps through a micro-demo's states on a timer while it is on screen.
 * Off screen it pauses; under reduced motion it holds the final state.
 * `durations` is how long each step lasts, in ms.
 */
export function useLoop<T extends HTMLElement>(durations: number[]) {
    const ref = useRef<T>(null);
    const inView = useInView(ref, { margin: "-10% 0px" });
    const reduced = useReducedMotion();
    const last = durations.length - 1;
    const [step, setStep] = useState(0);

    useEffect(() => {
        if (reduced || !inView) return;
        const timer = window.setTimeout(() => setStep((current) => (current + 1) % durations.length), durations[step] ?? 1000);
        return () => window.clearTimeout(timer);
    }, [durations, inView, reduced, step]);

    return { ref, step: reduced ? last : step, reduced: Boolean(reduced) };
}

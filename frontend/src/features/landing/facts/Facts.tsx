import { useEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";
import { FACTS } from "../content";
import styles from "./Facts.module.css";

/**
 * Facts under the hero. Each value counts up once, the first time the panel
 * is in view; the text always holds the final value for screen readers and
 * reduced motion. "N flows" is derived from the Verified list in content.ts.
 */
export function Facts() {
    const ref = useRef<HTMLDListElement>(null);
    const inView = useInView(ref, { once: true, margin: "-15% 0px" });

    return (
        <dl ref={ref} className={styles.facts}>
            {FACTS.map((fact) => (
                <div key={fact.label}>
                    <dt><CountUp value={fact.value} run={inView} /></dt>
                    <dd>{fact.label}</dd>
                </div>
            ))}
        </dl>
    );
}

function CountUp({ value, run }: { value: string; run: boolean }) {
    const ref = useRef<HTMLSpanElement>(null);
    const reduced = useReducedMotion();
    const match = /^([\d.]+)(.*)$/.exec(value);

    useEffect(() => {
        const element = ref.current;
        if (!element || !match || !run || reduced) return;
        const target = Number(match[1]);
        const decimals = match[1]?.includes(".") ? match[1].split(".")[1]?.length ?? 0 : 0;
        if (target === 0) return;
        const controls = animate(0, target, {
            duration: 1.1,
            ease: [0.16, 1, 0.3, 1],
            onUpdate: (latest) => {
                element.textContent = `${latest.toFixed(decimals)}${match[2]}`;
            }
        });
        return () => controls.stop();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, when the panel first comes into view
    }, [run, reduced]);

    // The final value is in the DOM from the start; the animation only rewrites it on screen.
    return (
        <>
            <span className="visually-hidden">{value}</span>
            <span ref={ref} aria-hidden="true">{value}</span>
        </>
    );
}

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../../../lib/usePrefersReducedMotion";
import { FACTS } from "../content";
import styles from "./Facts.module.css";

/**
 * Facts under the hero. Each value counts up once, the first time the panel
 * is in view; the text always holds the final value for screen readers and
 * reduced motion. "N flows" is derived from the Verified list in content.ts.
 */
export function Facts() {
    const ref = useRef<HTMLDListElement>(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry?.isIntersecting) {
                setInView(true);
                observer.disconnect();
            }
        }, { rootMargin: "0px 0px -15% 0px" });
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

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
    const reduced = usePrefersReducedMotion();
    const match = /^([\d.]+)(.*)$/.exec(value);

    useEffect(() => {
        const element = ref.current;
        if (!element || !match || !run || reduced) return;
        const target = Number(match[1]);
        const decimals = match[1]?.includes(".") ? match[1].split(".")[1]?.length ?? 0 : 0;
        if (target === 0) return;
        // 1.1 s on an exponential ease-out (the landing entrance curve), in rAF.
        const started = performance.now();
        let raf = 0;
        const tick = (now: number) => {
            const t = Math.min(1, (now - started) / 1100);
            const eased = t === 1 ? 1 : 1 - 2 ** (-10 * t);
            element.textContent = `${(target * eased).toFixed(decimals)}${match[2]}`;
            if (t < 1) raf = window.requestAnimationFrame(tick);
        };
        raf = window.requestAnimationFrame(tick);
        return () => window.cancelAnimationFrame(raf);
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

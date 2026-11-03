import type { ReactNode } from "react";
import { LazyMotion, MotionConfig, m, useReducedMotion } from "motion/react";

const loadFeatures = () => import("./motionFeatures").then((module) => module.default);

/** The landing page's easing: a long, soft ease-out. */
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** Wraps the page once: animation features load lazily, and the visitor's reduced-motion setting is respected. */
export function RevealProvider({ children }: { children: ReactNode }) {
    return (
        <LazyMotion features={loadFeatures} strict>
            <MotionConfig reducedMotion="user">{children}</MotionConfig>
        </LazyMotion>
    );
}

interface RevealProps {
    children: ReactNode;
    className?: string;
    /** Position in a group: each step adds 50 ms of delay. */
    index?: number;
    as?: "div" | "li" | "article";
}

/**
 * Fades and rises 12 px into place once, when it enters the viewport:
 * 500 ms on the landing ease. Transform and opacity only, so nothing shifts
 * the layout. Under reduced motion the content is simply there.
 */
export function Reveal({ children, className, index = 0, as = "div" }: RevealProps) {
    const reduced = useReducedMotion();
    const Component = m[as];

    if (reduced) {
        const Static = as;
        return <Static className={className}>{children}</Static>;
    }

    return (
        <Component
            className={className}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -8% 0px" }}
            transition={{ duration: 0.5, ease: EASE_OUT, delay: index * 0.05 }}
        >
            {children}
        </Component>
    );
}

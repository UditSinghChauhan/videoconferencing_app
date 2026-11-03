import { createElement, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import styles from "./Reveal.module.css";

interface RevealProps {
    children: ReactNode;
    className?: string;
    /** Position in a group: each step adds 50 ms of delay. */
    index?: number;
    as?: "div" | "li" | "article";
}

/**
 * Fades and rises 12 px into place once, when it enters the viewport:
 * 500 ms on cubic-bezier(0.16, 1, 0.3, 1), 50 ms stagger. Transform and
 * opacity only, so nothing shifts the layout. Plain CSS and one observer,
 * so it adds nothing to the first paint (motion/react drives the deferred
 * sections' own animations). Reduced motion: the content is simply there.
 */
export function Reveal({ children, className, index = 0, as = "div" }: RevealProps) {
    const ref = useRef<HTMLElement>(null);
    const [shown, setShown] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry?.isIntersecting) {
                setShown(true);
                observer.disconnect();
            }
        }, { rootMargin: "0px 0px -8% 0px" });
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    return createElement(
        as,
        {
            ref,
            className: [styles.reveal, className].filter(Boolean).join(" "),
            "data-shown": shown || undefined,
            style: { "--reveal-delay": `${index * 50}ms` } as CSSProperties
        },
        children
    );
}

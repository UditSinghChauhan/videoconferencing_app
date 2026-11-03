import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Renders a below-the-fold section only as it approaches the viewport (or
 * once the page is idle), so its code and DOM stay out of the first paint.
 * The placeholder keeps roughly the section's height; scroll anchoring keeps
 * the page steady if it settles to a different height above the viewport.
 */
export function Deferred({ children, minHeight, id}: { children: ReactNode; minHeight: string; id?: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const [show, setShow] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element || show) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry?.isIntersecting) setShow(true);
        }, { rootMargin: "800px 0px" });
        observer.observe(element);
        // A visitor who jumps by anchor or prints the page still gets everything.
        const hasIdle = typeof window.requestIdleCallback === "function";
        const idle = hasIdle
            ? window.requestIdleCallback(() => setShow(true), { timeout: 6000 })
            : window.setTimeout(() => setShow(true), 4000);
        return () => {
            observer.disconnect();
            if (hasIdle) window.cancelIdleCallback(idle);
            else window.clearTimeout(idle);
        };
    }, [show]);

    const placeholder = <div style={{ minHeight }} aria-hidden="true" />;
    return <div ref={ref} id={id} className="deferred">{show ? <Suspense fallback={placeholder}>{children}</Suspense> : placeholder}</div>;
}

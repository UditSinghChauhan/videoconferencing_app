import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Renders its children only once the placeholder comes within a screen or so
 * of the viewport, so the illustrated sections below the fold cost nothing
 * during the first load. The placeholder keeps the section's height (set by
 * the caller's class), so nothing above it moves when it fills in.
 */
export function Deferred({ children, className }: { children: ReactNode; className?: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const [show, setShow] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        // Following a link to #features should land on the real content.
        if (window.location.hash) {
            setShow(true);
            return;
        }
        const observer = new IntersectionObserver(([entry]) => {
            if (entry?.isIntersecting) {
                setShow(true);
                observer.disconnect();
            }
        }, { rootMargin: "800px 0px" });
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={ref} className={show ? undefined : className}>
            {show ? <Suspense fallback={null}>{children}</Suspense> : null}
        </div>
    );
}

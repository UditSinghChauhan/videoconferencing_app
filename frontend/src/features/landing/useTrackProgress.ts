import { useLayoutEffect, useRef, type RefObject } from "react";
import { useScroll, useTransform, type MotionValue } from "motion/react";

/**
 * 0 → 1 as a tall element scrolls past a pinned (sticky) child: 0 when its
 * top meets the top of the viewport, 1 when its bottom meets the bottom.
 * Read from the page's native scroll; the element is measured on resize.
 */
export function useTrackProgress(ref: RefObject<HTMLElement>): MotionValue<number> {
    const { scrollY } = useScroll();
    const box = useRef({ top: 0, range: 1 });

    useLayoutEffect(() => {
        const element = ref.current;
        if (!element) return;
        const measure = () => {
            const rect = element.getBoundingClientRect();
            box.current = { top: rect.top + window.scrollY, range: Math.max(1, rect.height - window.innerHeight) };
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        observer.observe(document.body);
        window.addEventListener("resize", measure);
        return () => {
            observer.disconnect();
            window.removeEventListener("resize", measure);
        };
    }, [ref]);

    return useTransform(scrollY, (y) => Math.min(1, Math.max(0, (y - box.current.top) / box.current.range)));
}

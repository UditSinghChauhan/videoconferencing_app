import { useEffect, useRef, useState } from "react";

/**
 * Index of the walkthrough step whose text crosses the middle band of the
 * viewport. Plain scrolling drives it; nothing hijacks the scroll.
 */
export function useActiveStep(count: number) {
    const refs = useRef<(HTMLElement | null)[]>([]);
    const [active, setActive] = useState(0);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        const index = refs.current.indexOf(entry.target as HTMLElement);
                        if (index >= 0) setActive(index);
                    }
                }
            },
            // A band at 55 to 65 % of the viewport: below the sticky pane on tablets,
            // and just past the middle on desktop, where the eye reads.
            { rootMargin: "-55% 0px -35% 0px" }
        );

        refs.current.slice(0, count).forEach((element) => element && observer.observe(element));
        return () => observer.disconnect();
    }, [count]);

    const register = (index: number) => (element: HTMLElement | null) => {
        refs.current[index] = element;
    };

    return { active, register };
}

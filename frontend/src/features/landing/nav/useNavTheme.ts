import { useEffect, useState } from "react";

/** The middle of the nav bar; a dark section under this line turns the nav dark. */
const NAV_PROBE = 32;
/** Scroll distance after which the nav becomes translucent with a hairline. */
const SCROLLED_AFTER = 40;

/**
 * Section-aware nav state from native scroll: `scrolled` after 40 px, and
 * `dark` while any element marked `data-nav-theme="dark"` sits under the nav.
 * One rAF-throttled passive listener; a handful of rect reads per frame.
 */
export function useNavTheme() {
    const [scrolled, setScrolled] = useState(false);
    const [dark, setDark] = useState(false);

    useEffect(() => {
        let frame = 0;
        const update = () => {
            frame = 0;
            setScrolled(window.scrollY > SCROLLED_AFTER);
            const darkSections = document.querySelectorAll('[data-nav-theme="dark"]');
            let underDark = false;
            darkSections.forEach((element) => {
                const { top, bottom } = element.getBoundingClientRect();
                if (top <= NAV_PROBE && bottom >= NAV_PROBE) underDark = true;
            });
            setDark(underDark);
        };
        const schedule = () => {
            if (!frame) frame = window.requestAnimationFrame(update);
        };
        update();
        window.addEventListener("scroll", schedule, { passive: true });
        window.addEventListener("resize", schedule);
        return () => {
            window.removeEventListener("scroll", schedule);
            window.removeEventListener("resize", schedule);
            if (frame) window.cancelAnimationFrame(frame);
        };
    }, []);

    return { scrolled, dark };
}

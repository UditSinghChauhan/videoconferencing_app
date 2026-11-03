import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ButtonLink } from "../../../components/Button";
import { Logo } from "../../../components/Logo";
import styles from "./LandingNav.module.css";

interface LandingNavProps {
    signedIn: boolean;
    links: { href: string; label: string }[];
}

/** Scrolled past 24 px: the bar lifts into a floating rounded panel. */
function useScrolled(threshold = 24) {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        let raf = 0;
        const update = () => {
            raf = 0;
            setScrolled(window.scrollY > threshold);
        };
        const schedule = () => {
            if (!raf) raf = window.requestAnimationFrame(update);
        };
        update();
        window.addEventListener("scroll", schedule, { passive: true });
        return () => {
            window.removeEventListener("scroll", schedule);
            if (raf) window.cancelAnimationFrame(raf);
        };
    }, [threshold]);

    return scrolled;
}

/**
 * Transparent at the top of the page; after 24 px of scroll it becomes a
 * floating bar (inset 12 px, white at 85 % with a blur, hairline and shadow)
 * so headings never show through it. Three section links, Sign in, and the
 * one accent action.
 */
export function LandingNav({ signedIn, links }: LandingNavProps) {
    const scrolled = useScrolled();

    return (
        <header className={styles.nav} data-scrolled={scrolled || undefined}>
            <div className={styles.bar}>
                <Logo />
                <nav className={styles.links} aria-label="Sections">
                    {links.map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}
                </nav>
                <div className={styles.actions}>
                    {signedIn ? <Link to="/home" className={styles.signIn}>Your meetings</Link> : <Link to="/auth" className={styles.signIn}>Sign in</Link>}
                    <ButtonLink to="/demo" size="sm" variant="accent">Try the demo</ButtonLink>
                </div>
            </div>
        </header>
    );
}

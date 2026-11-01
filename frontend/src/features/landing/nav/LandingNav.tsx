import { Link } from "react-router-dom";
import { GithubIcon } from "../../../components/GithubIcon";
import { Logo } from "../../../components/Logo";
import { REPOSITORY_URL } from "../../../lib/env";
import styles from "./LandingNav.module.css";
import { useNavTheme } from "./useNavTheme";

interface LandingNavProps {
    signedIn: boolean;
    links: { href: string; label: string }[];
}

/** Paper at the top, translucent with a hairline once scrolled, dark tokens over dark sections. */
export function LandingNav({ signedIn, links }: LandingNavProps) {
    const { scrolled, dark } = useNavTheme();

    return (
        <header className={styles.nav} data-scrolled={scrolled || undefined} data-theme={dark ? "dark" : "light"}>
            <div className={styles.inner}>
                <Logo />
                <nav className={styles.links} aria-label="Sections">
                    {links.map((link) => link.href.startsWith("/")
                        ? <Link key={link.href} to={link.href}>{link.label}</Link>
                        : <a key={link.href} href={link.href}>{link.label}</a>)}
                </nav>
                <div className={styles.actions}>
                    {signedIn ? <Link to="/home">Your meetings</Link> : <Link to="/auth">Sign in</Link>}
                    <a href={REPOSITORY_URL} target="_blank" rel="noreferrer" className={styles.github}>
                        <GithubIcon /> <span>GitHub</span>
                    </a>
                </div>
            </div>
        </header>
    );
}

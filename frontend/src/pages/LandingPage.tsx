import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { ButtonLink } from "../components/Button";
import { GithubIcon } from "../components/GithubIcon";
import { Logo } from "../components/Logo";
import { AppFrame } from "../features/landing/AppFrame";
import { ArchitectureFigure } from "../features/landing/ArchitectureFigure";
import { E2E_SPEC_PATH, ENGINEERING, OUTCOMES, VERIFIED } from "../features/landing/content";
import { HeroRecording } from "../features/landing/HeroRecording";
import { Walkthrough } from "../features/landing/Walkthrough";
import { wakeServer } from "../lib/api";
import { AUTHOR_URL, LINKEDIN_URL, REPOSITORY_URL } from "../lib/env";
import styles from "./LandingPage.module.css";

const sourceUrl = (path: string) => `${REPOSITORY_URL}/blob/master/${path}`;

export default function LandingPage() {
    const { status } = useAuth();
    const signedIn = status === "authenticated";
    const startHref = signedIn ? "/home" : "/auth?mode=signup";

    // The API sleeps on free hosting. Start it booting once the page has
    // painted, so "Start a meeting" is usually instant by the time it is clicked.
    useEffect(() => {
        const timer = window.setTimeout(() => void wakeServer(), 1500);
        return () => window.clearTimeout(timer);
    }, []);

    return (
        <div className={styles.page}>
            <header className={styles.nav}>
                <div className={styles.navInner}>
                    <Logo />
                    <nav className={styles.navLinks} aria-label="Sections">
                        <a href="#walkthrough">Walkthrough</a>
                        <a href="#engineering">Engineering</a>
                        <a href="#verified">Verified</a>
                    </nav>
                    <div className={styles.navActions}>
                        {signedIn ? <Link to="/home">Your meetings</Link> : <Link to="/auth">Sign in</Link>}
                        <a href={REPOSITORY_URL} target="_blank" rel="noreferrer" className={styles.navGithub}>
                            <GithubIcon /> <span>GitHub</span>
                        </a>
                    </div>
                </div>
            </header>

            <main id="main">
                <section className={styles.hero} aria-labelledby="hero-title">
                    <p className={styles.eyebrow}>Video calls for small teams</p>
                    <h1 id="hero-title" className={styles.headline}>
                        Meetings that end with a <em>recap</em>.
                    </h1>
                    <p className={styles.lede}>
                        Start a call, share the link, talk. When the host ends it, everyone gets the key points and the full transcript.
                    </p>
                    <div className={styles.heroActions}>
                        <ButtonLink to="/demo" size="lg" variant="accent">Try the live demo</ButtonLink>
                        <ButtonLink to={startHref} size="lg" variant="secondary">
                            {signedIn ? "Go to your meetings" : "Start a meeting"}
                        </ButtonLink>
                    </div>
                    <p className={styles.heroNote}>The demo needs no account and runs in your browser.</p>

                    <figure className={styles.heroFigure}>
                        <AppFrame address="bridgefrontend.onrender.com">
                            <HeroRecording />
                        </AppFrame>
                        <figcaption>
                            Recorded from the running app: four people, one call, and the recap the server writes when the host ends it. No external AI.
                        </figcaption>
                    </figure>
                </section>

                <section id="walkthrough" className={styles.section} aria-labelledby="walkthrough-title">
                    <div className={styles.intro}>
                        <p className={styles.eyebrow}>Walkthrough</p>
                        <h2 id="walkthrough-title" className={styles.sectionTitle}>From link to recap.</h2>
                    </div>
                    <Walkthrough />
                </section>

                <section className={styles.section} aria-labelledby="outcomes-title">
                    <div className={styles.intro}>
                        <p className={styles.eyebrow}>What you get</p>
                        <h2 id="outcomes-title" className={styles.sectionTitle}>What you can count on.</h2>
                    </div>
                    <ul className={styles.outcomes}>
                        {OUTCOMES.map((outcome) => (
                            <li key={outcome.title}>
                                <h3>{outcome.title}</h3>
                                <p>{outcome.body}</p>
                            </li>
                        ))}
                    </ul>
                </section>

                <section id="engineering" className={styles.engineering} aria-labelledby="engineering-title">
                    <div className={styles.engineeringInner}>
                        <div className={styles.intro}>
                            <p className={styles.eyebrowDark}>Under the hood</p>
                            <h2 id="engineering-title" className={styles.sectionTitle}>Built like a product, documented like a system.</h2>
                            <p className={styles.engineeringLede}>
                                Media flows peer to peer. The server only authenticates, relays signalling inside a room and keeps the record, which keeps it cheap to run. The trade-off is upload bandwidth, so Bridge is built for rooms of up to about six people; larger rooms would need an SFU.
                            </p>
                        </div>

                        <ArchitectureFigure />

                        <ul className={styles.notes}>
                            {ENGINEERING.map((note) => (
                                <li key={note.label}>
                                    <h3>{note.label}</h3>
                                    <p>{note.detail}</p>
                                    <a href={sourceUrl(note.path)} target="_blank" rel="noreferrer">
                                        {note.path.split("/").pop()}
                                        <span className="visually-hidden"> on GitHub, opens in a new tab</span>
                                    </a>
                                </li>
                            ))}
                        </ul>

                        <div className={styles.engineeringActions}>
                            <a className={styles.outlineDark} href={sourceUrl("ARCHITECTURE.md")} target="_blank" rel="noreferrer">
                                Read the architecture notes
                            </a>
                            <a className={styles.linkDark} href={REPOSITORY_URL} target="_blank" rel="noreferrer">
                                <GithubIcon /> Source on GitHub
                            </a>
                        </div>
                    </div>
                </section>

                <section id="verified" className={styles.section} aria-labelledby="verified-title">
                    <div className={styles.intro}>
                        <p className={styles.eyebrow}>Verified</p>
                        <h2 id="verified-title" className={styles.sectionTitle}>Tested end to end.</h2>
                        <p className={styles.sectionLede}>
                            Each flow runs in real browsers against the real API and database, in Playwright tests that ship with the code.
                        </p>
                    </div>
                    <ul className={styles.verified}>
                        {VERIFIED.map((item) => (
                            <li key={item.flow}>
                                <Check size={18} aria-hidden="true" className={styles.pass} />
                                <span className={styles.flow}>
                                    {item.flow}
                                    <span className="visually-hidden">: passing</span>
                                </span>
                                <code className={styles.testName}>{item.test}</code>
                            </li>
                        ))}
                    </ul>
                    <a className={styles.textLink} href={sourceUrl(E2E_SPEC_PATH)} target="_blank" rel="noreferrer">
                        Read the test suite<span className="visually-hidden"> on GitHub, opens in a new tab</span>
                    </a>
                </section>

                <section className={styles.closing} aria-labelledby="closing-title">
                    <h2 id="closing-title" className={styles.closingTitle}>See a call turn into its recap.</h2>
                    <div className={styles.heroActions}>
                        <ButtonLink to="/demo" size="lg" variant="accent">Try the live demo</ButtonLink>
                    </div>
                    <p className={styles.heroNote}>
                        Or <Link to={startHref}>{signedIn ? "go to your meetings" : "create an account"}</Link> and host a real one.
                    </p>
                </section>
            </main>

            <footer className={styles.footer}>
                <div className={styles.footerInner}>
                    <Logo />
                    <p>
                        Designed and built by <a href={AUTHOR_URL} target="_blank" rel="noreferrer">Udit Singh Chauhan</a>.
                    </p>
                    <div className={styles.footerLinks}>
                        <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">GitHub</a>
                        <a href={LINKEDIN_URL} target="_blank" rel="noreferrer">LinkedIn</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}

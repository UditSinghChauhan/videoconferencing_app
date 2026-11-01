import { lazy, useEffect } from "react";
import { Link } from "react-router-dom";
import { LandingNav } from "../features/landing/nav/LandingNav";
import { useAuth } from "../auth/AuthContext";
import { ButtonLink } from "../components/Button";
import { GithubIcon } from "../components/GithubIcon";
import { Logo } from "../components/Logo";
import { DECISIONS, E2E_SPEC_PATH, ENGINEERING } from "../features/landing/content";
import { Deferred } from "../features/landing/Deferred";
import { Facts } from "../features/landing/facts/Facts";
import { HeroStage } from "../features/landing/hero/HeroStage";
import { wakeServer } from "../lib/api";
import { AUTHOR_URL, LINKEDIN_URL, PORTFOLIO_URL, REPOSITORY_URL } from "../lib/env";
import styles from "./LandingPage.module.css";

// Below the fold: each section's code loads as it approaches the viewport,
// keeping the animation library and the demos out of the first paint.
const SignatureChapter = lazy(() => import("../features/landing/chapter/SignatureChapter"));
const Walkthrough = lazy(() => import("../features/landing/Walkthrough"));
const Bento = lazy(() => import("../features/landing/bento/Bento"));
const ArchitectureFigure = lazy(() => import("../features/landing/ArchitectureFigure"));
const VerifiedTerminal = lazy(() => import("../features/landing/verified/VerifiedTerminal"));
const ClosingLoop = lazy(() => import("../features/landing/closing/ClosingLoop"));


const SECTION_LINKS = [
    { href: "#signature", label: "How it works" },
    { href: "#walkthrough", label: "Walkthrough" },
    { href: "#engineering", label: "Engineering" },
    { href: "#decisions", label: "Decisions" },
    { href: "#verified", label: "Verified" },
    { href: "/design-notes", label: "Design notes" }
];

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
            <LandingNav signedIn={signedIn} links={SECTION_LINKS} />

            <main id="main">
                <section className={styles.hero} aria-labelledby="hero-title">
                    <h1 id="hero-title" className={styles.headline}>
                        Meetings that end with a <em>recap</em>.
                    </h1>
                    <p className={styles.lede}>
                        Video calls for small teams. When the host ends one, everyone gets the key points and the full transcript.
                    </p>
                    <div className={styles.heroActions}>
                        <ButtonLink to="/demo" size="lg" variant="accent">Try the live demo</ButtonLink>
                        <ButtonLink to={startHref} size="lg" variant="secondary">
                            {signedIn ? "Go to your meetings" : "Start a meeting"}
                        </ButtonLink>
                    </div>
                    <p className={styles.heroNote}>The demo needs no account and runs in your browser.</p>

<figure className={styles.heroFigure}>
                        <HeroStage />
                        <figcaption>
                            Recorded from the running app with an illustrated demo cast. The recap is written on the server from the chat and activity, with no external AI.
                        </figcaption>
                    </figure>

                    <Facts />
                </section>

                <Deferred id="signature" minHeight="calc(320vh + 240px)"><SignatureChapter /></Deferred>

                <section id="walkthrough" className={styles.section} aria-labelledby="walkthrough-title">
                    <div className={styles.intro}>
                        <h2 id="walkthrough-title" className={styles.sectionTitle}>From link to recap.</h2>
                    </div>
                    <Deferred minHeight="1600px"><Walkthrough /></Deferred>
                </section>

<section className={styles.section} aria-labelledby="outcomes-title">
                    <div className={styles.intro}>
                        <h2 id="outcomes-title" className={styles.sectionTitle}>What you can count on.</h2>
                    </div>
                    <Deferred minHeight="1000px"><Bento /></Deferred>
                </section>

                <section id="engineering" className={styles.engineering} aria-labelledby="engineering-title" data-nav-theme="dark">
                    <div className={styles.engineeringInner}>
                        <div className={styles.intro}>
                            <h2 id="engineering-title" className={styles.sectionTitle}>Built like a product, documented like a system.</h2>
                            <p className={styles.engineeringLede}>
                                Media flows peer to peer. The server only authenticates, relays signalling inside a room and keeps the record, which keeps it cheap to run. The trade-off is upload bandwidth, so Bridge is built for rooms of up to about six people; larger rooms would need an SFU.
                            </p>
                        </div>

                        <Deferred minHeight="600px"><ArchitectureFigure /></Deferred>

                        <ul className={styles.notes}>
                            {ENGINEERING.map((note) => (
                                <li key={note.label}>
                                    <h3>{note.label}</h3>
                                    <p>{note.detail}</p>
                                    <a href={sourceUrl(note.path)} target="_blank" rel="noreferrer">
                                        <code>{note.path.split("/").pop()}</code>
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

                <section id="decisions" className={styles.section} aria-labelledby="decisions-title">
                    <div className={styles.intro}>
                        <h2 id="decisions-title" className={styles.sectionTitle}>Why it is built this way.</h2>
                        <p className={styles.sectionLede}>
                            Three decisions that shape Bridge, each with the reason for it and what it costs.
                        </p>
                    </div>
                    <ol className={styles.decisions}>
                        {DECISIONS.map((item) => (
                            <li key={item.decision} className={styles.decision}>
                                <h3>{item.decision}</h3>
                                <div className={styles.decisionBlock}>
                                    <p className={styles.decisionLabel}>Why</p>
                                    <p>{item.why}</p>
                                </div>
                                <div className={styles.decisionBlock}>
                                    <p className={styles.decisionLabel}>Cost</p>
                                    <p>{item.cost}</p>
                                </div>
                                {item.wouldChange ? (
                                    <p className={styles.wouldChange}><strong>Would change when</strong> {item.wouldChange}</p>
                                ) : null}
                            </li>
                        ))}
                    </ol>
                </section>

                <section id="verified" className={styles.section} aria-labelledby="verified-title">
                    <div className={styles.intro}>
                        <h2 id="verified-title" className={styles.sectionTitle}>Tested end to end.</h2>
                        <p className={styles.sectionLede}>
                            Each flow runs in real browsers against the real API and database, in Playwright tests that ship with the code.{" "}
                            <a className={styles.inlineLink} href={sourceUrl(E2E_SPEC_PATH)} target="_blank" rel="noreferrer">
                                Read the test suite<span className="visually-hidden"> on GitHub, opens in a new tab</span>
                            </a>.
                        </p>
                    </div>
                    <Deferred minHeight="720px"><VerifiedTerminal /></Deferred>
                </section>

<section className={styles.closing} aria-labelledby="closing-title">
                    <h2 id="closing-title" className={styles.closingTitle}>See a call turn into its recap.</h2>
                    <div className={styles.heroActions}>
                        <ButtonLink to="/demo" size="lg" variant="accent">Try the live demo</ButtonLink>
                        <ButtonLink to={startHref} size="lg" variant="secondary">
                            {signedIn ? "Go to your meetings" : "Start a meeting"}
                        </ButtonLink>
                    </div>
                    <Deferred minHeight="460px"><ClosingLoop /></Deferred>
                </section>
            </main>

<footer className={styles.footer}>
                <div className={styles.footerInner}>
                    <Logo />
                    <p>
                        Designed and built by <a href={AUTHOR_URL} target="_blank" rel="noreferrer">Udit Singh Chauhan</a>
                    </p>
                    <nav className={styles.footerLinks} aria-label="More">
                        <Link to="/design-notes">Design notes</Link>
                        {PORTFOLIO_URL ? <a href={PORTFOLIO_URL} target="_blank" rel="noreferrer">Portfolio</a> : null}
                        <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">GitHub</a>
                        <a href={LINKEDIN_URL} target="_blank" rel="noreferrer">LinkedIn</a>
                    </nav>
                </div>
            </footer>
        </div>
    );
}

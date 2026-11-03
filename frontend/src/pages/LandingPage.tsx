import { lazy, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { ButtonLink } from "../components/Button";
import { Logo } from "../components/Logo";
import { BENEFITS } from "../features/landing/content";
import { Deferred } from "../features/landing/Deferred";
import { Faq } from "../features/landing/faq/Faq";
import { HeroDemo } from "../features/landing/hero/HeroDemo";
import { LandingNav } from "../features/landing/nav/LandingNav";
import { Reveal } from "../features/landing/Reveal";
import { wakeServer } from "../lib/api";
import { AUTHOR_URL, LINKEDIN_URL, REPOSITORY_URL } from "../lib/env";
import styles from "./LandingPage.module.css";

// Below the fold: the illustrated sections load as they approach the viewport.
const HowItWorks = lazy(() => import("../features/landing/how/HowItWorks"));
const Product = lazy(() => import("../features/landing/product/Product"));

const SECTION_LINKS = [
    { href: "#how-it-works", label: "How it works" },
    { href: "#features", label: "Features" },
    { href: "#faq", label: "FAQ" }
];

/** A hairline across the page with a small "+" where it meets each rail. */
function Divider() {
    return (
        <div className={styles.divider} aria-hidden="true">
            <span className={styles.plus} />
            <span className={styles.plus} />
        </div>
    );
}

/** The bydefault-style section opening: a small muted label, then a short centred heading. */
function SectionHead({ id, label, title, children }: { id: string; label: string; title: string; children?: React.ReactNode }) {
    return (
        <Reveal className={styles.head}>
            <p className={styles.label}>{label}</p>
            <h2 id={id} className={styles.title}>{title}</h2>
            {children ? <p className={styles.lede}>{children}</p> : null}
        </Reveal>
    );
}

export default function LandingPage() {
    const { status } = useAuth();
    const signedIn = status === "authenticated";
    const startHref = signedIn ? "/home" : "/auth?mode=signup";
    const startLabel = signedIn ? "Go to your meetings" : "Start a meeting";

    // The API sleeps on free hosting. Start it booting once the page has
    // painted, so "Start a meeting" is usually instant by the time it is clicked.
    useEffect(() => {
        const timer = window.setTimeout(() => void wakeServer(), 1500);
        return () => window.clearTimeout(timer);
    }, []);

    return (
        <div className={styles.page}>
            <LandingNav signedIn={signedIn} links={SECTION_LINKS} />

            <div className={styles.frame}>
                <main id="main">
                    <section className={styles.heroCard} aria-labelledby="hero-title">
                        <h1 id="hero-title" className={styles.headline}>
                            Meetings that end with a <em>recap</em>.
                        </h1>
                        <p className={styles.sub}>
                            Video calls for small teams. When the host ends the call, everyone gets the summary, the action items and the transcript.
                        </p>
                        <div className={styles.actions}>
                            <ButtonLink to="/demo" size="lg" variant="accent">Try the live demo</ButtonLink>
                            <Link to={startHref} className={styles.textLink}>
                                {startLabel} <ArrowRight size={16} aria-hidden="true" />
                            </Link>
                        </div>
                        <p className={styles.note}>No account needed for the demo</p>
                        <HeroDemo />
                    </section>

                    <Divider />

                    <section className={styles.benefits} aria-labelledby="benefits-title">
                        <h2 id="benefits-title" className="visually-hidden">Why Bridge</h2>
                        {BENEFITS.map((benefit, index) => (
                            <Reveal key={benefit.title} index={index} className={styles.benefit}>
                                <h3>{benefit.title}</h3>
                                <p>{benefit.body}</p>
                            </Reveal>
                        ))}
                    </section>

                    <Divider />

                    <section id="how-it-works" className={styles.section} aria-labelledby="how-title">
                        <SectionHead id="how-title" label="How it works" title="From link to recap in three steps" />
                        <Deferred className={styles.howPlaceholder}><HowItWorks /></Deferred>
                    </section>

                    <Divider />

                    <section id="features" className={styles.section} aria-labelledby="features-title">
                        <SectionHead id="features-title" label="Features" title="Everything a small team’s call needs" />
                        <Deferred className={styles.productPlaceholder}><Product /></Deferred>
                    </section>

                    <Divider />

                    <section id="faq" className={styles.section} aria-labelledby="faq-title">
                        <SectionHead id="faq-title" label="FAQ" title="Questions, answered" />
                        <Faq />
                    </section>

                    <Divider />

                    <section className={styles.ctaWrap} aria-labelledby="cta-title">
                        <Reveal className={styles.cta}>
                            <h2 id="cta-title">Your next meeting can end with notes.</h2>
                            <p>Try a call with the demo cast, end it, and read the recap. It takes a minute.</p>
                            <div className={styles.actions}>
                                <ButtonLink to="/demo" size="lg" variant="accent">Try the live demo</ButtonLink>
                                <Link to={startHref} className={styles.ctaLink}>
                                    {startLabel} <ArrowRight size={16} aria-hidden="true" />
                                </Link>
                            </div>
                        </Reveal>
                    </section>
                </main>

                <footer className={styles.footer}>
                    <div className={styles.footerBrand}>
                        <Logo />
                        <p>Video calls for small teams that end with a written recap.</p>
                    </div>
                    <nav className={styles.footerLinks} aria-label="Footer">
                        {signedIn ? <Link to="/home">Your meetings</Link> : <Link to="/auth">Sign in</Link>}
                        <Link to="/demo">Live demo</Link>
                        <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">GitHub</a>
                        <a href={LINKEDIN_URL} target="_blank" rel="noreferrer">LinkedIn</a>
                    </nav>
                    <p className={styles.credit}>
                        Designed and built by <a href={AUTHOR_URL} target="_blank" rel="noreferrer">Udit Singh Chauhan</a>
                    </p>
                </footer>
            </div>
        </div>
    );
}

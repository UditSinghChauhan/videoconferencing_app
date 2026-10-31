import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
    ArrowRight,
    DoorOpen,
    FileText,

    KeyRound,
    MessageSquare,
    Mic,
    MicOff,
    MonitorUp,
    PhoneOff,
    RefreshCw,
    ShieldCheck,
    Users,
    Video
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { ButtonLink } from "../components/Button";
import { GithubIcon } from "../components/GithubIcon";
import { Logo } from "../components/Logo";
import { VideoTile } from "../features/room/VideoTile";
import type { TileModel } from "../features/room/types";
import { AUTHOR_URL, REPOSITORY_URL } from "../lib/env";
import styles from "./LandingPage.module.css";

const PREVIEW_TILES: TileModel[] = [
    { id: "a", name: "Maya Patel", isLocal: false, isHost: true, stream: null, media: { audio: true, video: false, screen: false }, simulatedSpeaking: true },
    { id: "b", name: "Jordan Lee", isLocal: false, stream: null, media: { audio: false, video: false, screen: false } },
    { id: "c", name: "Aarav Mehta", isLocal: false, stream: null, media: { audio: true, video: false, screen: false } },
    { id: "d", name: "Sofia Rossi", isLocal: false, stream: null, media: { audio: true, video: false, screen: false } }
];

const STEPS = [
    {
        title: "Start",
        body: "One click creates a room with a code like kmt-vrqp-xhw. A lobby checks your camera and mic before anyone sees you."
    },
    {
        title: "Share",
        body: "Send the link. People join from the browser, with no install and no plugins. The host sees everyone and can remove anyone."
    },
    {
        title: "Wrap up",
        body: "When the host ends the call, Bridge writes the recap: key points, what happened, topics and the full chat transcript."
    }
];

const FEATURES = [
    { icon: DoorOpen, title: "A lobby before the call", body: "Preview your camera, mute before you join, and see exactly which device is blocked and how to fix it." },
    { icon: Users, title: "Host controls", body: "Only the host can remove people or end the meeting, and the API enforces it, not just the buttons." },
    { icon: Mic, title: "Live presence", body: "Speaking indicators, mute badges and a presenter spotlight, so you always know who is talking." },
    { icon: FileText, title: "Recap and transcript", body: "Every ended meeting keeps a recap you can copy as Markdown into Slack, Notion or an email." },
    { icon: KeyRound, title: "Sessions done properly", body: "Short-lived access tokens, rotating refresh tokens in httpOnly cookies, CSRF checks, and sign out of every device." },
    { icon: RefreshCw, title: "Recovers on its own", body: "Network blips reconnect automatically, and opening a second tab hands over cleanly instead of duplicating you." }
];

const ENGINEERING = [
    { label: "WebRTC mesh", detail: "Perfect negotiation with fixed transceivers. Muting, camera and screen share switch tracks without renegotiating." },
    { label: "Socket.IO signalling", detail: "Authenticated handshake, room-scoped relays and per-socket media state." },
    { label: "Express + MongoDB", detail: "Zod-validated routes, server-side roles, atomic chat writes and indexed history." },
    { label: "Tested end to end", detail: "Unit tests, Socket.IO integration tests on an in-memory MongoDB, and Playwright flows with two real browsers." }
];

function ProductPreview() {
    const ref = useRef<HTMLDivElement>(null);

    // Decorative copy of the room UI: hide it from keyboard and screen readers.
    useEffect(() => {
        ref.current?.setAttribute("inert", "");
    }, []);

    return (
        <div ref={ref} className={styles.preview} aria-hidden="true">
            <div className={styles.window}>
                <div className={styles.windowBar}>
                    <span />
                    <span />
                    <span />
                    <code>bridge.app/room/kmt-vrqp-xhw</code>
                </div>
                <div className={styles.room}>
                    <div className={styles.roomTop}>
                        <code>kmt-vrqp-xhw</code>
                        <span className={styles.live}><i /> Live · 18:42</span>
                    </div>
                    <div className={styles.roomBody}>
                        <div className={styles.tiles}>
                            {PREVIEW_TILES.map((tile) => (
                                <VideoTile key={tile.id} tile={tile} />
                            ))}
                        </div>
                        <div className={styles.chatPeek}>
                            <strong>Chat</strong>
                            <p><b>Maya</b> Release checklist is done. Next: the onboarding bug.</p>
                            <p><b>Aarav</b> Fix merges before lunch, deadline Thursday.</p>
                            <p><b>Sofia</b> I'll follow up with design today.</p>
                        </div>
                    </div>
                    <div className={styles.controls}>
                        <span><Mic size={16} /></span>
                        <span><Video size={16} /></span>
                        <span><MonitorUp size={16} /></span>
                        <span className={styles.spacer} />
                        <span><Users size={16} /></span>
                        <span><MessageSquare size={16} /></span>
                        <span className={styles.end}><PhoneOff size={14} /> End</span>
                    </div>
                </div>
            </div>

            <div className={styles.recapCard}>
                <span className={styles.recapLabel}>Recap · 24 min · 4 people</span>
                <p className={styles.recapLead}>The meeting focused mainly on release, onboarding and deadline.</p>
                <ol>
                    <li>Aarav: Fix merges before lunch, deadline Thursday.</li>
                    <li>Sofia: I'll follow up with design today.</li>
                </ol>
                <div className={styles.recapChips}>
                    <span>release</span>
                    <span>onboarding</span>
                    <span>deadline</span>
                </div>
            </div>
            <div className={styles.muteBadge}>
                <MicOff size={14} /> Jordan muted
            </div>
        </div>
    );
}

export default function LandingPage() {
    const { status } = useAuth();
    const signedIn = status === "authenticated";
    const startHref = signedIn ? "/home" : "/auth?mode=signup";

    return (
        <div className={styles.page}>
            <header className={styles.nav}>
                <div className={styles.navInner}>
                    <Logo />
                    <nav className={styles.navLinks} aria-label="Sections">
                        <a href="#how-it-works">How it works</a>
                        <a href="#features">Features</a>
                        <a href="#engineering">Engineering</a>
                    </nav>
                    <div className={styles.navActions}>
                        {signedIn ? (
                            <ButtonLink to="/home" size="sm">Open Bridge</ButtonLink>
                        ) : (
                            <>
                                <Link to="/auth" className={styles.signIn}>Sign in</Link>
                                <ButtonLink to="/auth?mode=signup" size="sm">Get started</ButtonLink>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main id="main">
                <section className={styles.hero}>
                    <div className={styles.heroCopy}>
                        <p className={styles.eyebrow}>Video meetings for small teams</p>
                        <h1 className={styles.headline}>
                            Meetings that end with a <em>recap</em>.
                        </h1>
                        <p className={styles.lede}>
                            Start a call in one click, share the link, talk. When the host ends it, Bridge hands everyone the key points, highlights and transcript, with no notetaker and no install.
                        </p>
                        <div className={styles.heroActions}>
                            <ButtonLink to={startHref} size="lg" icon={<ArrowRight size={18} aria-hidden="true" />}>
                                {signedIn ? "Go to your meetings" : "Start a meeting"}
                            </ButtonLink>
                            <ButtonLink to="/demo" size="lg" variant="secondary">
                                Try the live demo
                            </ButtonLink>
                        </div>
                        <p className={styles.heroNote}>The demo needs no account. Your camera stays on your device.</p>
                    </div>
                    <ProductPreview />
                </section>

                <section id="how-it-works" className={styles.section} aria-labelledby="how-title">
                    <div className={styles.sectionIntro}>
                        <p className={styles.eyebrow}>How it works</p>
                        <h2 id="how-title" className={styles.sectionTitle}>From link to recap in three steps.</h2>
                    </div>
                    <ol className={styles.steps}>
                        {STEPS.map((step, index) => (
                            <li key={step.title}>
                                <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
                                <h3>{step.title}</h3>
                                <p>{step.body}</p>
                            </li>
                        ))}
                    </ol>
                </section>

                <section id="features" className={styles.section} aria-labelledby="features-title">
                    <div className={styles.sectionIntro}>
                        <p className={styles.eyebrow}>Features</p>
                        <h2 id="features-title" className={styles.sectionTitle}>The parts of a meeting app people actually notice.</h2>
                    </div>
                    <ul className={styles.features}>
                        {FEATURES.map(({ icon: Icon, title, body }) => (
                            <li key={title}>
                                <Icon size={20} aria-hidden="true" className={styles.featureIcon} />
                                <h3>{title}</h3>
                                <p>{body}</p>
                            </li>
                        ))}
                    </ul>
                </section>

                <section id="engineering" className={styles.engineering} aria-labelledby="engineering-title">
                    <div className={styles.engineeringInner}>
                        <div className={styles.sectionIntro}>
                            <p className={styles.eyebrowDark}>Under the hood</p>
                            <h2 id="engineering-title" className={styles.sectionTitle}>Built like a product, documented like a system.</h2>
                            <p className={styles.engineeringLede}>
                                Media flows peer to peer. The server only authenticates, relays signalling inside a room and keeps the record, which keeps it cheap to run. The trade-off is upload bandwidth, so Bridge is designed for rooms of up to about six people; larger rooms would need an SFU.
                            </p>
                        </div>

                        <figure className={styles.diagram} aria-label="Architecture: browsers exchange media directly over WebRTC; Socket.IO relays signalling; the Express API stores users, meetings and recaps in MongoDB.">
                            <div className={styles.diagramRow}>
                                <div className={styles.node}><strong>Browser A</strong><span>React · WebRTC</span></div>
                                <div className={styles.link}><span>media, peer to peer</span></div>
                                <div className={styles.node}><strong>Browser B</strong><span>React · WebRTC</span></div>
                            </div>
                            <div className={styles.diagramStem}><span>signalling + REST</span></div>
                            <div className={styles.diagramRow}>
                                <div className={`${styles.node} ${styles.nodeWide}`}><strong>Node.js API</strong><span>Express · Socket.IO · JWT sessions · Zod</span></div>
                            </div>
                            <div className={styles.diagramStem} />
                            <div className={styles.diagramRow}>
                                <div className={`${styles.node} ${styles.nodeWide}`}><strong>MongoDB</strong><span>users · sessions · meetings · activity · recaps</span></div>
                            </div>
                        </figure>

                        <ul className={styles.engineeringList}>
                            {ENGINEERING.map((item) => (
                                <li key={item.label}>
                                    <strong>{item.label}</strong>
                                    <span>{item.detail}</span>
                                </li>
                            ))}
                        </ul>

                        <div className={styles.engineeringActions}>
                            <a className={styles.darkButton} href={`${REPOSITORY_URL}/blob/master/ARCHITECTURE.md`} target="_blank" rel="noreferrer">
                                Read the architecture notes
                            </a>
                            <a className={styles.darkLink} href={REPOSITORY_URL} target="_blank" rel="noreferrer">
                                <GithubIcon /> Source on GitHub
                            </a>
                        </div>
                    </div>
                </section>

                <section className={styles.cta} aria-labelledby="cta-title">
                    <ShieldCheck size={24} aria-hidden="true" className={styles.ctaIcon} />
                    <h2 id="cta-title" className={styles.sectionTitle}>Your next call can write its own notes.</h2>
                    <div className={styles.heroActions}>
                        <ButtonLink to={startHref} size="lg">{signedIn ? "Go to your meetings" : "Create a free account"}</ButtonLink>
                        <ButtonLink to="/demo" size="lg" variant="ghost">Try the demo first</ButtonLink>
                    </div>
                </section>
            </main>

            <footer className={styles.footer}>
                <div className={styles.footerInner}>
                    <Logo />
                    <p>
                        Designed and built by <a href={AUTHOR_URL} target="_blank" rel="noreferrer">Udit Singh Chauhan</a>.
                    </p>
                    <a href={REPOSITORY_URL} target="_blank" rel="noreferrer" className={styles.footerLink}>
                        <GithubIcon /> GitHub
                    </a>
                </div>
            </footer>
        </div>
    );
}

import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ButtonLink } from "../components/Button";
import { GithubIcon } from "../components/GithubIcon";
import { Logo } from "../components/Logo";
import { CAST_ORDER } from "../features/landing/cast/people";
import { STANDUP_RECAP } from "../features/landing/fixtures";
import { RecapCard } from "../features/landing/RecapCard";
import { CastTile } from "../features/landing/stage/StageParts";
import { AUTHOR_URL, LINKEDIN_URL, PORTFOLIO_URL, REPOSITORY_URL } from "../lib/env";
import styles from "./DesignNotesPage.module.css";

const source = (path: string) => `${REPOSITORY_URL}/blob/master/${path}`;

/** Tokens from styles/tokens.css, shown as live swatches (they read the CSS variables, so they follow dark mode). */
const WORKSPACE = [
    ["--bg", "Page"],
    ["--surface", "Cards, inputs"],
    ["--surface-2", "Hover, chips"],
    ["--text", "Text"],
    ["--text-muted", "Secondary text"],
    ["--accent", "Brand, live, focus"],
    ["--accent-text", "Rust as text"],
    ["--cta", "The one accent action"]
] as const;

const ROOM = [
    ["--room-bg", "Room"],
    ["--room-tile", "Tile"],
    ["--room-raised", "Controls"],
    ["--room-text", "Room text"],
    ["--room-muted", "Room secondary"],
    ["--room-danger", "End, mic off"]
] as const;

/**
 * Design notes: a case study that stands on its own for someone arriving
 * from a portfolio. Every fact is from the repository, its history, DESIGN.md
 * or ARCHITECTURE.md; nothing here is invented.
 */
export default function DesignNotesPage() {
    useEffect(() => {
        document.title = "Design notes · Bridge";
        return () => {
            document.title = "Bridge";
        };
    }, []);

    return (
        <div className={styles.page}>
            <header className={styles.top}>
                <Logo />
                <nav aria-label="Design notes">
                    <Link to="/">Bridge</Link>
                    <a href={REPOSITORY_URL} target="_blank" rel="noreferrer"><GithubIcon /> Source</a>
                </nav>
            </header>

            <main id="main" className={styles.main}>
                <article>
                    <header className={styles.intro}>
                        <h1>Design notes: Bridge</h1>
                        <p className={styles.summary}>
                            Bridge is a video-calling app for small teams where ending a call produces a written recap: key points, topics and the full transcript, for everyone who was there. I designed and built all of it, and these notes explain the decisions behind the interface, the recap and the landing page.
                        </p>
                        <dl className={styles.meta}>
                            <div><dt>Role</dt><dd>Product design, frontend and backend, solo</dd></div>
                            <div><dt>Timeline</dt><dd>March to November 2026, from the first commit on 17 March to the landing revamp on 1 November</dd></div>
                            <div><dt>Stack</dt><dd>React, TypeScript, Vite, CSS Modules, motion · Node.js, Express, Socket.IO, MongoDB · WebRTC mesh · Playwright, axe, Vitest</dd></div>
                        </dl>
                        <div className={styles.actions}>
                            <ButtonLink to="/demo" variant="accent">Try the live demo</ButtonLink>
                            <ButtonLink to="/" variant="secondary">See the landing page</ButtonLink>
                        </div>
                    </header>

                    <Section id="problem" title="The problem">
                        <p>
                            Most calls end with nobody sure who agreed to what. The notes are in one person's head, or in a chat log that scrolls away when the tab closes. Bridge's answer is narrow on purpose: the call itself is ordinary, and the moment the host presses End the server writes the recap from the chat and activity log and saves it to every participant's history.
                        </p>
                        <p>
                            That one transformation is the product, so the design goal was to make it visible: a live call becoming written notes, and nothing else competing for attention.
                        </p>
                    </Section>

                    <Section id="moods" title="Two moods: workspace and room">
                        <p>
                            Bridge has two surfaces with different jobs. The <strong>workspace</strong> (landing, sign in, dashboard, history, recap) is warm paper, ink and generous space, closer to a notebook than a dashboard. The <strong>room</strong> (lobby and live call) is always dark and neutral so faces and shared screens carry the colour, never the chrome. One rust accent crosses both: brand, live state, focus, and the speaking ring.
                        </p>
                        <div className={styles.swatchGroups}>
                            <Swatches title="Workspace" tokens={WORKSPACE} />
                            <Swatches title="Room" tokens={ROOM} dark />
                        </div>
                        <p className={styles.note}>
                            Live swatches: each reads its CSS variable from <a href={source("frontend/src/styles/tokens.css")} target="_blank" rel="noreferrer"><code>tokens.css</code></a>, so the workspace row changes in dark mode. Contrast for every text pair is measured by <a href={source("frontend/scripts/contrast.mjs")} target="_blank" rel="noreferrer"><code>scripts/contrast.mjs</code></a>; body text on paper is 16.41:1, muted text 5.98:1, rust text 5.11:1.
                        </p>
                    </Section>

                    <Section id="tiles" title="The room tile">
                        <div className={styles.tiles} aria-hidden="true">
                            <CastTile person={CAST_ORDER[0] ?? "maya"} host speaking still />
                            <CastTile person={CAST_ORDER[3] ?? "jordan"} muted still />
                        </div>
                        <ul className={styles.list}>
                            <li><strong>16:9 with a 14 px radius</strong>, so a grid of two to six reads as one surface rather than a wall of cards.</li>
                            <li><strong>Name chip bottom left</strong>, on a translucent dark plate, because faces sit high in a webcam frame.</li>
                            <li><strong>A rust ring while speaking</strong>, driven by a real audio analyser sampled about eight times a second with a short hold, so it does not flicker between words.</li>
                            <li><strong>Mic off is a red icon in the chip</strong>, and the control itself turns red, so state never depends on colour alone.</li>
                            <li><strong>Initials when the camera is off</strong>, in a hue hashed from the name, so a person keeps the same colour everywhere; screen shares switch to <code>contain</code> so nothing is cropped.</li>
                        </ul>
                    </Section>

                    <Section id="recap" title="The recap's information design">
                        <div className={styles.split}>
                            <div>
                                <p>
                                    A recap is read once, quickly, often by someone who left early. So it is ordered by what that reader needs first:
                                </p>
                                <ol className={styles.list}>
                                    <li>A status line confirming the meeting ended.</li>
                                    <li>The title and facts: date, duration, people, host.</li>
                                    <li>One serif sentence on what the meeting focused on.</li>
                                    <li>Up to three key points, numbered, quoting the person who said them.</li>
                                    <li>What happened (joins, removals, the end), who was there, and topics.</li>
                                    <li>The full transcript, folded away until needed.</li>
                                </ol>
                                <p>
                                    The recap is deterministic and has no external AI: <a href={source("backend/src/utils/meetingSummary.js")} target="_blank" rel="noreferrer"><code>meetingSummary.js</code></a> scores sentences for decisions, deadlines and next steps. During this revamp the Topics chips were found to promote verbs and labels (“owns”, “agenda”). The extractor now keeps noun phrases only, using stop and verb lists, suffix rules and bigram scoring, with a test that failed on the old output. For the stand-up on the landing page it now returns: {STANDUP_RECAP.keywords.join(", ")}.
                                </p>
                            </div>
                            <RecapCard decorative />
                        </div>
                    </Section>

                    <Section id="accessibility" title="Accessibility">
                        <ul className={styles.list}>
                            <li>Every page in the axe audit (<a href={source("frontend/tests/e2e/accessibility.spec.js")} target="_blank" rel="noreferrer"><code>accessibility.spec.js</code></a>) has zero WCAG 2.1 AA violations, including the live demo room and these notes.</li>
                            <li>A visible <code>:focus-visible</code> ring everywhere (2 px rust, 2 px offset), lighter on dark surfaces; sign in works with the keyboard alone, and that is tested.</li>
                            <li>Every animation has a reduced-motion path that shows the final state: the hero becomes the call beside its recap, the scroll chapter becomes four still blocks, loops do not run.</li>
                            <li>The demo cast is decorative inside tiles that already name the person; the scroll-driven demos are hidden from assistive tech and their meaning is in the text beside them.</li>
                            <li>The chat log is a polite live region; errors use <code>role="alert"</code>; hit targets for the main actions are 44 px or more.</li>
                        </ul>
                    </Section>

                    <Section id="before-after" title="Before and after">
                        <p>
                            The previous landing page was correct and calm, and nobody remembered it. A video-calling product showed no faces, because the capture script turned every camera off; the first frame was mostly blank; product text was 9 to 11 px; and the recap on the page showed the topic bug.
                        </p>
                        <div className={styles.compare}>
                            <figure>
                                <img src="/design-notes/before-hero.webp" width={1440} height={900} alt="The previous landing page: the headline over a dark frame of initials on grey tiles, no faces." loading="lazy" />
                                <figcaption>Before: initials on grey, no people.</figcaption>
                            </figure>
                            <figure>
                                <img src="/design-notes/after-hero.webp" width={1440} height={900} alt="The new landing page: the headline over a large frame showing four illustrated people on a Bridge call." loading="lazy" />
                                <figcaption>After: the call, with faces, at hero scale.</figcaption>
                            </figure>
                            <figure>
                                <img src="/design-notes/before-verified.webp" width={1120} height={626} alt="The previous test list: flows in two columns with test titles in a third column that did not line up." loading="lazy" />
                                <figcaption>Before: test titles that did not line up with their flows.</figcaption>
                            </figure>
                            <figure>
                                <img src="/design-notes/after-verified.webp" width={1120} height={864} alt="The new test list as a terminal: each Playwright test with its duration, and the flows it proves underneath." loading="lazy" />
                                <figcaption>After: a terminal that runs the suite, with real durations.</figcaption>
                            </figure>
                        </div>
                        <p>
                            The faces are an original illustrated cast, not stock and not generated photos: realistic fake faces in a product demo read as deceptive. Each cast member is rendered to a video and audio file and fed into Chrome as a fake camera and microphone, so the hero is still a recording of the running app and the real speaking detector moves the ring.
                        </p>
                    </Section>

                    <Section id="motion" title="Motion principles">
                        <ul className={styles.list}>
                            <li><strong>Motion explains cause and effect.</strong> The ring follows the voice; the call folds into a stack and the stack becomes notes.</li>
                            <li><strong>Entrances: 500 to 700 ms on <code>cubic-bezier(0.16, 1, 0.3, 1)</code>.</strong> Controls: 150 to 250 ms.</li>
                            <li><strong>Transform, opacity and filter only</strong>, so scrolling stays smooth; layout never animates.</li>
                            <li><strong>Native scroll.</strong> The signature chapter is pinned with <code>position: sticky</code> and scrubs both ways from scroll progress. Nothing hijacks, smooths or snaps the page.</li>
                            <li><strong>Loops pause off screen</strong> and every one has a still final state.</li>
                        </ul>
                    </Section>

                    <Section id="next" title="Next steps">
                        <ul className={styles.list}>
                            <li><strong>An SFU for larger rooms.</strong> The peer-to-peer mesh tops out at about six people because each person uploads a stream to everyone else. The same signalling would front a media server.</li>
                            <li><strong>Live captions.</strong> Not built. Captions would make calls accessible as they happen and give the recap spoken content, not only chat; it changes the privacy model, since audio would leave the browser.</li>
                            <li><strong>An LLM summary behind the same interface</strong>, once summary quality matters more than determinism and zero cost per meeting.</li>
                        </ul>
                    </Section>
                </article>
            </main>

            <footer className={styles.footer}>
                <p>
                    Designed and built by <a href={AUTHOR_URL} target="_blank" rel="noreferrer">Udit Singh Chauhan</a>
                </p>
                <nav aria-label="Elsewhere">
                    {PORTFOLIO_URL ? <a href={PORTFOLIO_URL} target="_blank" rel="noreferrer">Portfolio</a> : null}
                    <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">GitHub</a>
                    <a href={LINKEDIN_URL} target="_blank" rel="noreferrer">LinkedIn</a>
                </nav>
            </footer>
        </div>
    );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
    return (
        <section id={id} className={styles.section} aria-labelledby={`${id}-title`}>
            <h2 id={`${id}-title`}>{title}</h2>
            {children}
        </section>
    );
}

function Swatches({ title, tokens, dark = false }: { title: string; tokens: readonly (readonly [string, string])[]; dark?: boolean }) {
    return (
        <div className={styles.swatches} data-dark={dark || undefined}>
            <h3>{title}</h3>
            <ul>
                {tokens.map(([token, role]) => (
                    <li key={token}>
                        <span className={styles.chip} style={{ background: `var(${token})` }} aria-hidden="true" />
                        <code>{token}</code>
                        <span>{role}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

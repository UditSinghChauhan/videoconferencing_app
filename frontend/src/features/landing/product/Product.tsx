import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, MonitorUp, UserMinus, Wifi } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { RecapView } from "../../meetings/RecapView";
import { recapToMarkdown } from "../../meetings/recapMarkdown";
import { CAST, castByName, type CastId } from "../cast/people";
import { FEATURES } from "../content";
import { HISTORY, STANDUP, STANDUP_MEETING } from "../fixtures";
import { Reveal } from "../Reveal";
import { Face, FaceStack } from "../parts/People";
import { CastTile } from "../stage/StageParts";
import styles from "./Product.module.css";

/** The first lines of the real export, from the same function the button calls. */
const MARKDOWN = recapToMarkdown(STANDUP_MEETING).split("\n").slice(2, 13).join("\n");

const avatarFor = (name: string) => {
    const member = castByName(name);
    return member ? <Face person={member.id} size={20} /> : undefined;
};

/** The features: the real recap component with working copy, then small fragments that play on hover or focus. */
export default function Product() {
    return (
        <div className={styles.product}>
            <RecapFeature />
            <div className={styles.bento}>
                <Fragment feature="chat" index={0} className={styles.chatCard}><ChatFragment /></Fragment>
                <Fragment feature="host" index={1} className={styles.hostCard}><HostFragment /></Fragment>
                <Fragment feature="history" index={2} className={styles.historyCard}><HistoryFragment /></Fragment>
                <Fragment feature="screen" index={3} className={styles.screenCard}><ScreenFragment /></Fragment>
                <Fragment feature="reconnect" index={4} className={styles.reconnectCard}><ReconnectFragment /></Fragment>
            </div>
        </div>
    );
}

function RecapFeature() {
    const [toast, setToast] = useState<string | null>(null);
    const reduced = useReducedMotion();

    useEffect(() => {
        if (!toast) return;
        const timer = window.setTimeout(() => setToast(null), 2400);
        return () => window.clearTimeout(timer);
    }, [toast]);

    return (
        <Reveal className={`${styles.card} ${styles.recapCard}`}>
            <div className={styles.header}>
                <span>Meeting recap</span>
                <span className={styles.headerMeta}>The real recap page, with this stand-up’s output</span>
            </div>
            <div className={styles.recapLayout}>
                <div className={styles.recapText}>
                    <h3>{FEATURES.recap.title}</h3>
                    <p>{FEATURES.recap.body}</p>
                    <Link to="/demo" className={styles.more}>Make your own in the demo <ArrowRight size={15} aria-hidden="true" /></Link>
                    <figure className={styles.markdown}>
                        <figcaption>What Copy as Markdown gives you</figcaption>
                        <pre><code>{MARKDOWN}</code></pre>
                    </figure>
                </div>
                <div className={styles.recapPane}>
                    <RecapView
                        recap={STANDUP_MEETING}
                        headingLevel={3}
                        hideFootnote
                        renderAvatar={avatarFor}
                        onCopy={(copied) => setToast(copied ? "Recap copied as Markdown" : "Couldn’t copy. Select the text instead.")}
                    />
                </div>
            </div>
            <div className={styles.toastRegion} role="status" aria-live="polite">
                <AnimatePresence>
                    {toast ? (
                        <motion.span
                            key={toast}
                            className={styles.toast}
                            initial={reduced ? false : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: 4, transition: { duration: 0.15 } }}
                            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <Check size={15} aria-hidden="true" /> {toast}
                        </motion.span>
                    ) : null}
                </AnimatePresence>
            </div>
        </Reveal>
    );
}

/** A small card: header row, a fragment that animates on hover or keyboard focus, then the claim. */
function Fragment({ feature, index, className, children }: { feature: keyof typeof FEATURES; index: number; className?: string; children: ReactNode }) {
    const claim = FEATURES[feature];
    const id = `feature-${feature}`;
    return (
        <Reveal as="article" index={index} className={`${styles.card} ${styles.small} ${className ?? ""}`}>
            {/* Focusable so keyboard users get the same demo as a hover. */}
            <div className={styles.focusable} tabIndex={0} role="group" aria-labelledby={id}>
                <div className={styles.header}><span id={id}>{claim.title}</span></div>
                <div className={styles.fragment} aria-hidden="true">{children}</div>
                <p className={styles.body}>{claim.body}</p>
            </div>
        </Reveal>
    );
}

function Message({ from, text, className }: { from: CastId; text: string; className?: string }) {
    return (
        <li className={`${styles.message} ${className ?? ""}`}>
            <Face person={from} size={24} />
            <div>
                <strong>{CAST[from].name.split(" ")[0]}</strong>
                <p>{text}</p>
            </div>
        </li>
    );
}

function ChatFragment() {
    // Aarav's update, Jordan's numbers, then Jordan's next step arriving.
    const [first, second, third] = [STANDUP[1], STANDUP[3], STANDUP[4]];
    return (
        <ul className={styles.chat}>
            {first ? <Message from={first.from} text={first.text} /> : null}
            {second ? <Message from={second.from} text={second.text} /> : null}
            {third ? <Message from={third.from} text={third.text} className={styles.incoming} /> : null}
        </ul>
    );
}

function HostFragment() {
    return (
        <div className={styles.host}>
            <ul className={styles.roster}>
                <li><Face person="maya" size={24} /><span>Maya Patel</span><em>Host</em></li>
                <li><Face person="jordan" size={24} /><span>Jordan Lee</span><span className={styles.remove}><UserMinus size={14} /></span></li>
            </ul>
            <div className={styles.confirm}>
                <strong>Remove Jordan Lee from the call?</strong>
                <span className={styles.confirmActions}>
                    <span className={styles.ghost}>Cancel</span>
                    <span className={styles.danger}>Remove</span>
                </span>
            </div>
        </div>
    );
}

function ScreenFragment() {
    return (
        <div className={styles.screen}>
            <div className={styles.strip}>
                <CastTile person="aarav" still className={styles.mini} />
                <CastTile person="sofia" still className={styles.mini} />
            </div>
            <div className={styles.shared}>
                <div className={styles.slideBar}><MonitorUp size={13} /> Aarav is presenting</div>
                <div className={styles.slide}>
                    <strong>Release checklist</strong>
                    <span><i className={styles.done} /> Onboarding fix merged</span>
                    <span><i className={styles.done} /> Empty states signed off</span>
                    <span><i /> Final copy</span>
                </div>
            </div>
            <span className={styles.shareButton}><MonitorUp size={14} /> Share screen</span>
        </div>
    );
}

function ReconnectFragment() {
    return (
        <div className={styles.reconnect}>
            <div className={styles.pill}>
                <span className={styles.stateLive}><span className={styles.liveDot} /> Live · 17:52</span>
                <span className={styles.stateLost}><Wifi size={14} /> Reconnecting…</span>
                <span className={styles.stateBack}><Check size={14} /> Back in the call</span>
            </div>
            <div className={styles.bars}>
                {[0, 1, 2, 3, 4].map((bar) => <span key={bar} />)}
            </div>
        </div>
    );
}

function HistoryFragment() {
    return (
        <ul className={styles.history}>
            {HISTORY.map((meeting) => (
                <li key={meeting.code}>
                    <div className={styles.historyTop}>
                        <span className={styles.historyCode}>{meeting.code}</span>
                        <span className={styles.historyWhen}>{meeting.when} · {meeting.duration}</span>
                    </div>
                    <p>{meeting.summary}</p>
                    <FaceStack people={meeting.people} size={22} />
                </li>
            ))}
        </ul>
    );
}

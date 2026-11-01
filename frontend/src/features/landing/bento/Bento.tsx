import { AnimatePresence, motion } from "motion/react";
import { Check, ClipboardCopy, Link2, Mic, Video, WifiOff, X } from "lucide-react";
import { Avatar as Initials } from "../../../components/Avatar";
import buttonStyles from "../../../components/Button.module.css";
import toastStyles from "../../../components/Toast.module.css";
import recapStyles from "../../meetings/Recap.module.css";
import { recapToMarkdown } from "../../meetings/recapMarkdown";
import roomStyles from "../../room/RoomView.module.css";
import { Avatar } from "../cast/Avatar";
import { CAST, type CastId } from "../cast/people";
import { STANDUP_MEETING, STANDUP_RECAP } from "../fixtures";
import { CastTile } from "../stage/StageParts";
import { useLoop } from "./useLoop";
import styles from "./Bento.module.css";

const EASE = [0.16, 1, 0.3, 1] as const;
const enter = { duration: 0.55, ease: EASE };

/**
 * What you can count on: four outcomes, each with a looping micro-demo built
 * from real Bridge components and fixture data. 12 columns: two large tiles
 * and two small. Loops pause off screen; reduced motion shows the final state.
 */
export function Bento() {
    return (
        <ul className={styles.bento}>
            <Tile size="large" title="Everyone leaves with the same notes." body="The recap lands in each person's history and copies as Markdown for Slack, Notion or email.">
                <CopyDemo />
            </Tile>
            <Tile size="small" title="Join from a link, in seconds." body="No install and no account for the demo. A lobby checks your camera and mic first.">
                <JoinDemo />
            </Tile>
            <Tile size="small" title="Dropped connections come back." body="A network blip shows as reconnecting, then the call carries on without a reload.">
                <ReconnectDemo />
            </Tile>
            <Tile size="large" title="Only the host can remove people." body="Removing someone is checked by the API: a participant who calls the endpoint directly gets a 403.">
                <RemoveDemo />
            </Tile>
        </ul>
    );
}

function Tile({ size, title, body, children }: { size: "large" | "small"; title: string; body: string; children: React.ReactNode }) {
    return (
        <li className={styles.tile} data-size={size}>
            <div className={styles.copy}>
                <h3>{title}</h3>
                <p>{body}</p>
            </div>
            <div className={styles.demo} aria-hidden="true">{children}</div>
        </li>
    );
}

const COPY_STEPS = [1600, 900, 2600, 600];
const MARKDOWN = recapToMarkdown(STANDUP_MEETING).split("\n").filter((line) => line.startsWith("#") || line.startsWith("- ")).slice(0, 4);

/** The recap's Copy as Markdown button, its toast, and what lands on the clipboard. */
function CopyDemo() {
    const { ref, step } = useLoop<HTMLDivElement>(COPY_STEPS);
    const copied = step >= 2;
    return (
        <div ref={ref} className={styles.copyDemo}>
            <div className={styles.recapCard}>
                <div className={styles.recapHead}>
                    <p className={styles.recapTitle}>Meeting recap</p>
                    <motion.span
                        className={`${buttonStyles.button} ${buttonStyles.secondary} ${buttonStyles.sm} ${styles.fakeButton}`}
                        animate={{ scale: step === 1 ? 0.96 : 1 }}
                        transition={{ duration: 0.15 }}
                    >
                        <span className={buttonStyles.content}>
                            {copied ? <Check size={14} aria-hidden="true" /> : <ClipboardCopy size={14} aria-hidden="true" />}
                            {copied ? "Copied" : "Copy as Markdown"}
                        </span>
                    </motion.span>
                </div>
                <ol className={`${recapStyles.points} ${styles.points}`}>
                    {STANDUP_RECAP.keyPoints.slice(0, 2).map((point) => <li key={point}>{point}</li>)}
                </ol>
                <ul className={`${recapStyles.chips} ${styles.chips}`}>
                    {STANDUP_RECAP.keywords.slice(0, 4).map((topic) => <li key={topic}>{topic}</li>)}
                </ul>
            </div>
            <AnimatePresence>
                {copied ? (
                    <motion.pre key="md" className={styles.markdown} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={enter}>
                        {MARKDOWN.join("\n")}
                    </motion.pre>
                ) : null}
            </AnimatePresence>
            <AnimatePresence>
                {copied ? (
                    <motion.div key="toast" className={`${toastStyles.toast} ${toastStyles.success} ${styles.toast}`} initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.25, ease: EASE }}>
                        <Check size={16} aria-hidden="true" />
                        <span>Recap copied as Markdown</span>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}

const JOIN_STEPS = [1700, 2100, 2600];

/** Link, then the lobby's device check, then in the room. */
function JoinDemo() {
    const { ref, step } = useLoop<HTMLDivElement>(JOIN_STEPS);
    return (
        <div ref={ref} className={styles.joinDemo}>
            <AnimatePresence mode="popLayout" initial={false}>
                {step === 0 ? (
                    <motion.div key="link" className={styles.linkCard} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={enter}>
                        <Link2 size={16} aria-hidden="true" />
                        <span>bridgefrontend.onrender.com/room/<strong>kmt-vrqp-xhw</strong></span>
                    </motion.div>
                ) : null}
                {step === 1 ? (
                    <motion.div key="lobby" className={styles.lobby} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={enter}>
                        <p className={styles.lobbyTitle}>Ready to join?</p>
                        <div className={styles.preview}><Avatar person="sofia" /></div>
                        <div className={styles.devices}>
                            <span><Video size={14} aria-hidden="true" /> Camera on</span>
                            <span><Mic size={14} aria-hidden="true" /> <span className={styles.level}><motion.span animate={{ scaleX: [0.2, 0.8, 0.4, 0.9, 0.3] }} transition={{ duration: 1.6, repeat: Infinity }} /></span></span>
                        </div>
                    </motion.div>
                ) : null}
                {step === 2 ? (
                    <motion.div key="room" className={styles.miniRoom} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={enter}>
                        {(["maya", "sofia"] as CastId[]).map((person, index) => (
                            <motion.div key={person} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...enter, delay: index * 0.18 }}>
                                <CastTile person={person} host={person === "maya"} speaking={person === "sofia"} still />
                            </motion.div>
                        ))}
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}

const RECONNECT_STEPS = [1800, 2200, 2400];

/** The room's status pill: Live, Reconnecting…, Live again. */
function ReconnectDemo() {
    const { ref, step } = useLoop<HTMLDivElement>(RECONNECT_STEPS);
    const dropped = step === 1;
    return (
        <div ref={ref} className={styles.reconnectDemo}>
            <div className={styles.roomBar}>
                <span className={styles.roomCode}>kmt-vrqp-xhw</span>
                <AnimatePresence mode="wait" initial={false}>
                    {dropped ? (
                        <motion.span key="re" className={roomStyles.reconnecting} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.2 }}>
                            <WifiOff size={14} aria-hidden="true" /> Reconnecting…
                        </motion.span>
                    ) : (
                        <motion.span key="live" className={roomStyles.live} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.2 }}>
                            <span className={roomStyles.liveDot} aria-hidden="true" /> Live
                        </motion.span>
                    )}
                </AnimatePresence>
            </div>
            <motion.div className={styles.reconnectTile} animate={{ opacity: dropped ? 0.45 : 1, filter: dropped ? "grayscale(0.8)" : "grayscale(0)" }} transition={{ duration: 0.35 }}>
                <CastTile person="aarav" still />
            </motion.div>
            <AnimatePresence>
                {step === 2 ? (
                    <motion.p key="back" className={styles.recovered} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={enter}>
                        <Check size={14} aria-hidden="true" /> Back in the call
                    </motion.p>
                ) : null}
            </AnimatePresence>
        </div>
    );
}

const REMOVE_STEPS = [1500, 1300, 1600, 2800];

/** The host removes Jordan; a participant's own remove request is refused with 403. */
function RemoveDemo() {
    const { ref, step } = useLoop<HTMLDivElement>(REMOVE_STEPS);
    const people: CastId[] = step >= 2 ? ["maya", "aarav", "sofia"] : ["maya", "aarav", "sofia", "jordan"];
    return (
        <div ref={ref} className={styles.removeDemo}>
            <motion.div layout className={styles.removeGrid}>
                <AnimatePresence initial={false}>
                    {people.map((person) => (
                        <motion.div
                            key={person}
                            layout
                            className={styles.removeSlot}
                            exit={{ opacity: 0, scale: 0.8, filter: "blur(4px)" }}
                            transition={{ duration: 0.5, ease: EASE }}
                        >
                            <CastTile person={person} host={person === "maya"} still>
                                {person === "jordan" && step === 1 ? (
                                    <motion.span className={styles.removeButton} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
                                        <X size={14} aria-hidden="true" /> Remove
                                    </motion.span>
                                ) : null}
                            </CastTile>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </motion.div>
            <AnimatePresence>
                {step === 3 ? (
                    <motion.div key="403" className={styles.request} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={enter}>
                        <span className={styles.requestWho}><Initials name={CAST.aarav.name} size={24} /> {CAST.aarav.name}, a participant</span>
                        <code>POST /meetings/kmt-vrqp-xhw/remove-participant</code>
                        <span className={styles.status403}>403 Forbidden</span>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}

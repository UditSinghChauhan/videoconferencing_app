import { useRef } from "react";
import { useInView } from "motion/react";
import { Check, Copy, Mic, Video } from "lucide-react";
import { Reveal } from "../Reveal";
import { STEPS } from "../content";
import { MEETING_CODE, STANDUP_RECAP } from "../fixtures";
import { Face, OwnerChip } from "../parts/People";
import { CastTile } from "../stage/StageParts";
import type { CastId } from "../cast/people";
import styles from "./HowItWorks.module.css";

const JOINERS: { id: CastId; name: string }[] = [
    { id: "aarav", name: "Aarav Mehta" },
    { id: "sofia", name: "Sofia Rossi" },
    { id: "jordan", name: "Jordan Lee" }
];

/** Three cards, each a different small piece of the product. Each plays once when it comes into view. */
export function HowItWorks() {
    const ref = useRef<HTMLOListElement>(null);
    const run = useInView(ref, { once: true, margin: "0px 0px -20% 0px" });
    const vignettes = [<Lobby key="start" />, <Invite key="share" />, <MiniRecap key="recap" />];

    return (
        <ol ref={ref} className={styles.steps} data-run={run || undefined}>
            {STEPS.map((step, index) => (
                <Reveal as="li" key={step.title} index={index} className={styles.card}>
                    <div className={styles.header}>
                        <span className={styles.step}>{step.title}</span>
                    </div>
                    <div className={styles.vignette} aria-hidden="true">{vignettes[index]}</div>
                    <div className={styles.text}>
                        <h3>{step.heading}</h3>
                        <p>{step.body}</p>
                    </div>
                </Reveal>
            ))}
        </ol>
    );
}

/** The lobby: a self-preview with the speaking ring, and the device checks turning green. */
function Lobby() {
    return (
        <div className={styles.lobby}>
            <CastTile person="maya" speaking className={styles.preview} />
            <ul className={styles.devices}>
                <li className={styles.device}>
                    <Mic size={14} />
                    <span className={styles.checking}>Checking microphone…</span>
                    <span className={styles.ready}>Microphone on</span>
                </li>
                <li className={`${styles.device} ${styles.second}`}>
                    <Video size={14} />
                    <span className={styles.checking}>Checking camera…</span>
                    <span className={styles.ready}>Camera on</span>
                </li>
            </ul>
        </div>
    );
}

/** The invite link is copied, and people pop into the joined list. */
function Invite() {
    return (
        <div className={styles.invite}>
            <div className={styles.field}>
                <span className={styles.url}>bridgefrontend.onrender.com/room/<strong>{MEETING_CODE}</strong></span>
                <span className={styles.copy}>
                    <span className={styles.copyIdle}><Copy size={14} /> Copy</span>
                    <span className={styles.copyDone}><Check size={14} /> Copied</span>
                </span>
            </div>
            <ul className={styles.joined}>
                {JOINERS.map((person) => (
                    <li key={person.id}>
                        <Face person={person.id} size={28} />
                        <span className={styles.joinName}>{person.name}</span>
                        <span className={styles.joinTag}>Joined</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

/** A small recap: the summary, and an action item with its owner and the delivery checked off. */
function MiniRecap() {
    const item = STANDUP_RECAP.actionItems?.[1];
    return (
        <div className={styles.mini}>
            <p className={styles.miniSummary}>Agreed to ship the release on Thursday.</p>
            {item ? (
                <div className={styles.miniItem}>
                    <span className={styles.box} />
                    <span className={styles.miniTask}>{item.task}</span>
                    <OwnerChip name={item.owner} />
                </div>
            ) : null}
            <p className={styles.sent}>
                <span className={styles.sentCheck}><Check size={12} strokeWidth={3} /></span>
                In 4 people’s history
            </p>
        </div>
    );
}

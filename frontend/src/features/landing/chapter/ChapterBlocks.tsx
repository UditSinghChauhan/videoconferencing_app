import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { CAST_ORDER } from "../cast/people";
import { useSpeakerTimeline } from "../cast/useSpeakerTimeline";
import { STANDUP } from "../fixtures";
import { RecapCard } from "../RecapCard";
import { CastTile, StageChat, StageControls, StageMessage } from "../stage/StageParts";
import { BEATS } from "./beats";
import styles from "./ChapterBlocks.module.css";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The signature chapter without the pin: under 1024 px, and under reduced
 * motion (where `still` shows every final state at once). Each beat is a block
 * with its sentence and a small in-view animation of the same moment.
 */
export function ChapterBlocks({ still }: { still: boolean }) {
    return (
        <ol className={styles.blocks}>
            {BEATS.map((beat, index) => (
                <li key={beat.title} className={styles.block}>
                    <h3>{beat.title}</h3>
                    <p>{beat.body}</p>
                    <div className={styles.scene} aria-hidden="true">
                        {index === 0 ? <Call still={still} /> : null}
                        {index === 1 ? <Chat still={still} /> : null}
                        {index === 2 ? <End still={still} /> : null}
                        {index === 3 ? <Notes still={still} /> : null}
                    </div>
                </li>
            ))}
        </ol>
    );
}

function Call({ still }: { still: boolean }) {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { margin: "-20% 0px" });
    const { speaker } = useSpeakerTimeline({ playing: inView && !still });
    return (
        <div ref={ref} className={styles.room}>
            <div className={styles.grid}>
                {CAST_ORDER.map((person) => (
                    <CastTile key={person} person={person} speaking={!still && speaker === person} host={person === "maya"} still={still || !inView} />
                ))}
            </div>
        </div>
    );
}

function Chat({ still }: { still: boolean }) {
    return (
        <div className={styles.chat}>
            <StageChat>
                {STANDUP.map((message, index) => (
                    <motion.div
                        key={message.time}
                        initial={still ? false : { opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-15% 0px" }}
                        transition={{ duration: 0.6, ease: EASE, delay: index * 0.12 }}
                    >
                        <StageMessage message={message} own={message.from === "maya"} highlight={Boolean(message.decision)} />
                    </motion.div>
                ))}
            </StageChat>
        </div>
    );
}

function End({ still }: { still: boolean }) {
    return (
        <div className={styles.room}>
            <motion.div
                className={styles.stack}
                initial={still ? false : { scale: 1 }}
                whileInView={{ scale: 0.92 }}
                viewport={{ once: true, margin: "-25% 0px" }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.5 }}
            >
                {CAST_ORDER.map((person, index) => (
                    <div key={person} className={styles.stackTile} style={{ rotate: `${[-4, 3, -1, 5][index]}deg`, zIndex: 4 - index }}>
                        <CastTile person={person} still />
                    </div>
                ))}
            </motion.div>
            <motion.div
                initial={still ? false : { scale: 1 }}
                whileInView={{ scale: [1, 1.1, 1, 1.06, 1] }}
                viewport={{ once: true, margin: "-25% 0px" }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
                className={styles.controls}
            >
                <StageControls />
            </motion.div>
        </div>
    );
}

function Notes({ still }: { still: boolean }) {
    return (
        <motion.div
            initial={still ? false : { opacity: 0, y: 24, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-20% 0px" }}
            transition={{ duration: 0.7, ease: EASE }}
        >
            <RecapCard decorative />
        </motion.div>
    );
}

import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import recapStyles from "../../meetings/Recap.module.css";
import { CAST_ORDER } from "../cast/people";
import { STANDUP, STANDUP_RECAP } from "../fixtures";
import { CastTile, StageChat, StageControls, StageMessage } from "../stage/StageParts";
import { useMediaQuery } from "../useMediaQuery";
import { useTrackProgress } from "../useTrackProgress";
import { BEATS } from "./beats";
import { ChapterBlocks } from "./ChapterBlocks";
import styles from "./SignatureChapter.module.css";




/**
 * "Faces in, notes out." The signature chapter: a stage pinned for about
 * 300vh with native sticky positioning, scrubbed in both directions by scroll
 * progress. Built from real room and recap components with fixture data.
 * Under 1024 px, and under reduced motion, it becomes four plain blocks.
 */
export function SignatureChapter() {
    const wide = useMediaQuery("(min-width: 1024px)");
    const reduced = useReducedMotion();

    return (
        <section id="signature" className={styles.section} aria-labelledby="signature-title">
            <h2 id="signature-title" className={styles.sectionTitle}>Faces in, notes out.</h2>
            {wide && !reduced ? <PinnedStage /> : <ChapterBlocks still={Boolean(reduced)} />}
        </section>
    );
}

function PinnedStage() {
    const ref = useRef<HTMLDivElement>(null);
    const scrollYProgress = useTrackProgress(ref);
    const [beat, setBeat] = useState(0);
    const [speaker, setSpeaker] = useState(0);

    useMotionValueEvent(scrollYProgress, "change", (value) => {
        setBeat(Math.min(3, Math.max(0, Math.floor(value * 4))));
        // Beat 1: the ring moves through all four people.
        setSpeaker(Math.min(3, Math.floor(Math.max(0, value) / 0.25 * 4) % 4));
    });

    return (
        <div ref={ref} className={styles.track}>
            <div className={styles.sticky}>
                <ol className={styles.captions}>
                    {BEATS.map((item, index) => (
                        <li key={item.title} className={styles.caption} data-active={index === beat || undefined} aria-current={index === beat ? "step" : undefined}>
                            <h3>{item.title}</h3>
                            <p>{item.body}</p>
                        </li>
                    ))}
                </ol>
                <Progress progress={scrollYProgress} beat={beat} />
                <Stage progress={scrollYProgress} speaker={beat === 0 ? speaker : -1} />
            </div>
        </div>
    );
}

function Progress({ progress, beat }: { progress: MotionValue<number>; beat: number }) {
    const scaleX = useTransform(progress, [0, 1], [0, 1]);
    return (
        <div className={styles.progress} aria-hidden="true">
            <span className={styles.count}>{String(beat + 1).padStart(2, "0")} / 04</span>
            <span className={styles.rail}><motion.span className={styles.fill} style={{ scaleX }} /></span>
        </div>
    );
}

/** Maps progress inside [from, to] to 0..1, clamped. */
const useSpan = (progress: MotionValue<number>, from: number, to: number) => useTransform(progress, [from, to], [0, 1], { clamp: true });

/** Where each tile goes when the call folds into a stack (beat 3), as % of the grid. */
const STACK = [
    { x: 50, y: 50, r: -6 },
    { x: -50, y: 50, r: 4 },
    { x: 50, y: -50, r: -2 },
    { x: -50, y: -50, r: 7 }
];

function Stage({ progress, speaker }: { progress: MotionValue<number>; speaker: number }) {
    // Beat 2: the chat panel slides in, messages arrive, decisions light up.
    const chatIn = useSpan(progress, 0.25, 0.32);
    const chatX = useTransform(chatIn, [0, 1], ["24%", "0%"]);
    // The grid makes room by scaling toward the left edge (transform only, no layout).
    const gridScale = useTransform(chatIn, [0, 1], [1, 0.645]);
    // Beat 3: End pulses, the tiles fold into a stack, the room's chrome goes away.
    const fold = useSpan(progress, 0.56, 0.7);
    const endPulse = useTransform(progress, [0.5, 0.53, 0.56, 0.59], [1, 1.12, 1, 1.08]);
    const pulseRing = useTransform(progress, [0.49, 0.51, 0.58, 0.61], [0, 1, 1, 0]);
    const chatFade = useTransform(progress, [0.52, 0.6], [1, 0]);
    const chromeFade = useTransform(progress, [0.6, 0.7], [1, 0]);
    // Beat 4: the stack becomes the recap.
    const stackOut = useTransform(progress, [0.75, 0.8], [1, 0]);
    const stackScale = useTransform(progress, [0.75, 0.8], [1, 1.15]);
    const recapIn = useSpan(progress, 0.75, 0.8);
    const recapScale = useTransform(recapIn, [0, 1], [0.55, 1]);
    const recapBlur = useTransform(recapIn, [0, 1], ["blur(10px)", "blur(0px)"]);

    return (
        <div className={styles.stage} aria-hidden="true">
            <motion.div className={styles.roomBg} style={{ opacity: chromeFade }} />
            <div className={styles.room}>
                <div className={styles.roomBody}>
                    <motion.div className={styles.gridWrap} style={{ opacity: stackOut, scale: stackScale }}>
                        <motion.div className={styles.grid} style={{ scale: gridScale }}>
                            {CAST_ORDER.map((person, index) => (
                                <FoldingTile key={person} index={index} fold={fold} speaking={speaker === index} host={person === "maya"} />
                            ))}
                        </motion.div>
                    </motion.div>
                    <motion.div className={styles.chatSlot} style={{ opacity: chatFade }}>
                        <motion.div style={{ x: chatX, opacity: chatIn }} className={styles.chatInner}>
                            <StageChat>
                                {STANDUP.map((message, index) => (
                                    <ArrivingMessage key={message.time} progress={progress} index={index} message={message} />
                                ))}
                            </StageChat>
                        </motion.div>
                    </motion.div>
                </div>
                <motion.div className={styles.controlsRow} style={{ opacity: chromeFade }}>
                    <StageControls endClassName={styles.end} />
                    <motion.span className={styles.endPulse} style={{ scale: endPulse, opacity: pulseRing }} />
                </motion.div>
            </div>

            <motion.div className={styles.recap} style={{ opacity: recapIn, scale: recapScale, filter: recapBlur }}>
                <RecapBuild progress={progress} />
            </motion.div>
        </div>
    );
}

function FoldingTile({ index, fold, speaking, host }: { index: number; fold: MotionValue<number>; speaking: boolean; host: boolean }) {
    const target = STACK[index] ?? { x: 0, y: 0, r: 0 };
    const x = useTransform(fold, [0, 1], ["0%", `${target.x}%`]);
    const y = useTransform(fold, [0, 1], ["0%", `${target.y}%`]);
    const rotate = useTransform(fold, [0, 1], [0, target.r]);
    const scale = useTransform(fold, [0, 1], [1, 0.62]);
    return (
        <motion.div className={styles.tileSlot} style={{ x, y, rotate, scale, zIndex: 4 - index }}>
            <CastTile person={CAST_ORDER[index] ?? "maya"} speaking={speaking} host={host} />
        </motion.div>
    );
}

function ArrivingMessage({ progress, index, message }: { progress: MotionValue<number>; index: number; message: (typeof STANDUP)[number] }) {
    // Messages arrive across beat 2 (0.28 to 0.46).
    const at = 0.28 + index * 0.035;
    const opacity = useTransform(progress, [at, at + 0.02], [0, 1]);
    const y = useTransform(progress, [at, at + 0.02], [12, 0]);
    const [lit, setLit] = useState(false);
    useMotionValueEvent(progress, "change", (value) => setLit(Boolean(message.decision) && value > at + 0.04));
    return (
        <motion.div style={{ opacity, y }}>
            <StageMessage message={message} own={message.from === "maya"} highlight={lit} />
        </motion.div>
    );
}

function RecapBuild({ progress }: { progress: MotionValue<number> }) {
    return (
        <div className={styles.recapPage}>
            <p className={styles.recapNotice}>Meeting ended. Here’s the recap.</p>
            <p className={styles.recapTitle}>Meeting recap</p>
            <p className={styles.recapMeta}>4 people · 6 min · Host @maya</p>
            <div className={styles.recapColumns}>
                <div>
                    <p className={styles.recapLabel}>Key points</p>
                    <ol className={`${recapStyles.points} ${styles.recapPoints}`}>
                        {STANDUP_RECAP.keyPoints.map((point, index) => (
                            <WriteIn key={point} progress={progress} at={0.79 + index * 0.035}>{point}</WriteIn>
                        ))}
                    </ol>
                </div>
                <div>
                    <p className={styles.recapLabel}>Topics</p>
                    <ul className={`${recapStyles.chips} ${styles.recapChips}`}>
                        {STANDUP_RECAP.keywords.map((topic, index) => (
                            <Pop key={topic} progress={progress} at={0.88 + index * 0.012}>{topic}</Pop>
                        ))}
                    </ul>
                    <Transcript progress={progress} />
                </div>
            </div>
        </div>
    );
}

/** A key point writing in: a left-to-right reveal, then settled. */
function WriteIn({ progress, at, children }: { progress: MotionValue<number>; at: number; children: string }) {
    const reveal = useTransform(progress, [at, at + 0.03], [0, 100], { clamp: true });
    const clipPath = useTransform(reveal, (value) => `inset(0 ${100 - value}% 0 0)`);
    const opacity = useTransform(progress, [at, at + 0.006], [0, 1]);
    return <motion.li style={{ clipPath, opacity }}>{children}</motion.li>;
}

function Pop({ progress, at, children }: { progress: MotionValue<number>; at: number; children: string }) {
    const scale = useTransform(progress, [at, at + 0.012, at + 0.02], [0.6, 1.08, 1], { clamp: true });
    const opacity = useTransform(progress, [at, at + 0.01], [0, 1]);
    return <motion.li style={{ scale, opacity }}>{children}</motion.li>;
}

function Transcript({ progress }: { progress: MotionValue<number> }) {
    const open = useSpan(progress, 0.93, 0.99);
    const scaleY = useTransform(open, [0, 1], [0.4, 1]);
    return (
        <div className={styles.transcript}>
            <p className={styles.transcriptHead}>Chat transcript · 5 messages</p>
            <motion.ol style={{ scaleY, opacity: open }} className={styles.transcriptList}>
                {STANDUP.map((message) => (
                    <li key={message.time}>
                        <time>{message.time}</time> <strong>{message.sender.split(" ")[0]}</strong> {message.text}
                    </li>
                ))}
            </motion.ol>
        </div>
    );
}


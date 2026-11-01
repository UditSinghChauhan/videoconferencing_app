import { motion } from "motion/react";
import { useLoop } from "../bento/useLoop";
import { CAST_ORDER } from "../cast/people";
import { RecapCard } from "../RecapCard";
import { CastTile } from "../stage/StageParts";
import styles from "./ClosingLoop.module.css";

const EASE = [0.16, 1, 0.3, 1] as const;
/** The call (3.2 s), the fold into a stack (1.1 s), the recap (3.4 s). */
const STEPS = [3200, 1100, 3400];
const STACK = [
    { x: "50%", y: "50%", rotate: -6 },
    { x: "-50%", y: "50%", rotate: 4 },
    { x: "50%", y: "-50%", rotate: -2 },
    { x: "-50%", y: "-50%", rotate: 7 }
];

/** The page's idea once more, small: a call collapses into its recap, on a loop while in view. */
export default function ClosingLoop() {
    const { ref, step, reduced } = useLoop<HTMLDivElement>(STEPS);
    const folded = step >= 1;
    const showRecap = step === 2;
    return (
        <div ref={ref} className={styles.stage} aria-hidden="true">
            <motion.div
                className={styles.room}
                initial={false}
                animate={showRecap ? { opacity: 0, scale: 0.92, filter: "blur(6px)" } : { opacity: 1, scale: 1, filter: "blur(0px)" }}
                transition={{ duration: 0.45, ease: EASE }}
            >
                <div className={styles.grid}>
                    {CAST_ORDER.map((person, index) => (
                        <motion.div
                            key={person}
                            className={styles.slot}
                            initial={false}
                            animate={folded ? { ...STACK[index], scale: 0.7 } : { x: "0%", y: "0%", rotate: 0, scale: 1 }}
                            transition={{ duration: 0.7, ease: EASE }}
                            style={{ zIndex: 4 - index }}
                        >
                            <CastTile person={person} host={person === "maya"} speaking={!folded && index === 1} still={reduced} />
                        </motion.div>
                    ))}
                </div>
            </motion.div>
            <motion.div
                className={styles.recap}
                initial={false}
                animate={showRecap ? { opacity: 1, scale: 1, filter: "blur(0px)" } : { opacity: 0, scale: 0.8, filter: "blur(8px)" }}
                transition={{ duration: 0.6, ease: EASE, delay: showRecap ? 0.15 : 0 }}
            >
                <RecapCard points={2} decorative />
            </motion.div>
        </div>
    );
}

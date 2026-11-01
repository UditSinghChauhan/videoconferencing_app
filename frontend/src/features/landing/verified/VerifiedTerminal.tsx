import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import { REPOSITORY_URL } from "../../../lib/env";
import { E2E_SPEC_PATH, TEST_LINES, VERIFIED, type VerifiedFlow } from "../content";
import run from "../e2e-run.json";
import styles from "./VerifiedTerminal.module.css";

const specUrl = (line: number) => `${REPOSITORY_URL}/blob/master/${E2E_SPEC_PATH}#L${line}`;
const durations = run.tests as Record<string, number | undefined>;

/** Flows grouped under the Playwright test that proves them, in first-seen order. */
const GROUPS = [...VERIFIED.reduce((groups, flow) => {
    groups.set(flow.test, [...(groups.get(flow.test) ?? []), flow]);
    return groups;
}, new Map<string, VerifiedFlow[]>())];

const EASE = [0.16, 1, 0.3, 1] as const;
/** Seconds between lines as the suite "runs". */
const LINE_GAP = 0.32;

/**
 * Tested end to end, as a terminal that runs the suite when it enters the
 * viewport: each test types in, then its flows tick off. Durations come only
 * from a real Playwright JSON report (e2e-run.json, scripts/e2e-durations.mjs);
 * a test without one shows no time. Reduced motion shows the finished run.
 */
export default function VerifiedTerminal() {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: "-20% 0px" });
    const reduced = Boolean(useReducedMotion());
    const play = inView || reduced;
    let line = 0;

    return (
        <div ref={ref} className={styles.terminal}>
            <div className={styles.bar}>
                <span className={styles.barTitle}>frontend · Playwright</span>
            </div>
            <div className={styles.body}>
                <p className={styles.command}>
                    <span className={styles.prompt} aria-hidden="true">$</span> npx playwright test {E2E_SPEC_PATH.split("/").slice(1).join("/")}
                </p>
                <ul className={styles.groups}>
                    {GROUPS.map(([test, flows]) => {
                        const line0 = line++;
                        const testLine = TEST_LINES[test] ?? 1;
                        const ms = durations[test];
                        return (
                            <li key={test} className={styles.group}>
                                <Typed index={line0} play={play} reduced={reduced} className={styles.test}>
                                    <PassMark index={line0} play={play} reduced={reduced} />
                                    <a href={specUrl(testLine)} target="_blank" rel="noreferrer" className={styles.testLink}>
                                        <span className={styles.file}>{E2E_SPEC_PATH.split("/").pop()}:{testLine}</span>
                                        <span className={styles.testTitle}>{test}</span>
                                        <span className="visually-hidden">: passed. Opens the test on GitHub in a new tab.</span>
                                    </a>
                                    {ms ? <span className={styles.duration}>{(ms / 1000).toFixed(1)}s</span> : null}
                                </Typed>
                                <ul className={styles.flows}>
                                    {flows.map((flow) => {
                                        const index = line++;
                                        return (
                                            <Typed key={flow.flow} index={index} play={play} reduced={reduced} className={styles.flow} as="li">
                                                <Check size={15} aria-hidden="true" className={styles.check} />
                                                <span className={styles.flowName}>{flow.flow}<span className="visually-hidden">: passing.</span></span>
                                                <span className={styles.flowDetail}>{flow.detail}</span>
                                            </Typed>
                                        );
                                    })}
                                </ul>
                            </li>
                        );
                    })}
                </ul>
                <Typed index={line} play={play} reduced={reduced} className={styles.summary}>
                    <span className={styles.passed}>{VERIFIED.length} flows in {GROUPS.length} tests passed</span>
                    {run.ranAt ? <span className={styles.ran}> · local run, {new Date(run.ranAt).toISOString().slice(0, 10)}</span> : null}
                </Typed>
            </div>
        </div>
    );
}

/**
 * A line that types in: a cover the colour of the terminal slides off it in
 * steps (transform only), after its turn in the run.
 */
function Typed({ index, play, reduced, className, children, as = "p" }: { index: number; play: boolean; reduced: boolean; className?: string; children: React.ReactNode; as?: "p" | "li" }) {
    const Tag = as === "li" ? motion.li : motion.p;
    return (
        <Tag
            className={[styles.line, className].filter(Boolean).join(" ")}
            initial={reduced ? false : { opacity: 0 }}
            animate={play ? { opacity: 1 } : undefined}
            transition={{ duration: 0.01, delay: index * LINE_GAP }}
        >
            {children}
            {reduced ? null : (
                <motion.span
                    className={styles.cover}
                    aria-hidden="true"
                    initial={{ x: "0%" }}
                    animate={play ? { x: "101%" } : undefined}
                    transition={{ duration: 0.28, ease: (t) => Math.round(t * 18) / 18, delay: index * LINE_GAP }}
                />
            )}
        </Tag>
    );
}

function PassMark({ index, play, reduced }: { index: number; play: boolean; reduced: boolean }) {
    return (
        <motion.span
            className={styles.pass}
            aria-hidden="true"
            initial={reduced ? false : { scale: 0.4, opacity: 0 }}
            animate={play ? { scale: 1, opacity: 1 } : undefined}
            transition={{ duration: 0.4, ease: EASE, delay: index * LINE_GAP + 0.3 }}
        >
            ✓
        </motion.span>
    );
}

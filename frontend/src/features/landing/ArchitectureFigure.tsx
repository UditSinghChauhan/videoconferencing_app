import { useRef } from "react";
import { useInView } from "motion/react";
import styles from "./ArchitectureFigure.module.css";

/**
 * One figure. From 1024 px it is an SVG diagram with traffic moving through
 * it on a 4 s loop: media packets go peer to peer along the dashed line,
 * signalling goes browser → API → browser, and a write pulse goes API →
 * MongoDB as the recap is saved. The loop pauses off screen and is still
 * under reduced motion. Below 1024 px, and always for screen readers, the
 * same facts are an ordered list.
 */
export default function ArchitectureFigure() {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { margin: "0px" });

    return (
        <figure className={styles.figure}>
            <div ref={ref} className={styles.diagram} data-playing={inView || undefined} aria-hidden="true">
                <svg viewBox="0 0 960 470" className={styles.svg}>
                    {/* Connectors */}
                    <line x1="290" y1="78" x2="670" y2="78" className={styles.media} />
                    <line x1="200" y1="126" x2="400" y2="236" className={styles.wire} />
                    <line x1="760" y1="126" x2="560" y2="236" className={styles.wire} />
                    <line x1="480" y1="326" x2="480" y2="380" className={styles.wire} />

                    {/* Labels */}
                    <text x="480" y="112" className={styles.mediaLabel}>media, peer to peer (WebRTC)</text>
                    <text x="480" y="182" className={styles.label}>signalling (Socket.IO) and REST, from each browser</text>
                    <text x="496" y="358" className={styles.labelStart}>reads and writes</text>

                    {/* Nodes */}
                    <Node x={50} y={30} w={240} h={96} name="Browser A" stack="React · WebRTC" />
                    <Node x={670} y={30} w={240} h={96} name="Browser B" stack="React · WebRTC" />
                    <Node x={300} y={236} w={360} h={90} name="Node.js API" stack="Express · Socket.IO · JWT sessions · Zod" />
                    <g className={styles.db}>
                        <Node x={300} y={380} w={360} h={84} name="MongoDB" stack="users · sessions · meetings · activity · recaps" />
                        <rect x="300" y="380" width="360" height="84" rx="14" className={styles.dbFlash} />
                    </g>

                    {/* Traffic: transform and opacity only. */}
                    <circle cx="290" cy="78" r="6" className={`${styles.packet} ${styles.mediaAB}`} />
                    <circle cx="290" cy="78" r="6" className={`${styles.packet} ${styles.mediaAB} ${styles.later}`} />
                    <circle cx="670" cy="78" r="6" className={`${styles.packet} ${styles.mediaBA}`} />
                    <circle cx="200" cy="126" r="5" className={`${styles.signal} ${styles.toApi}`} />
                    <circle cx="560" cy="236" r="5" className={`${styles.signal} ${styles.toB}`} />
                    <circle cx="480" cy="326" r="6" className={`${styles.packet} ${styles.write}`} />
                </svg>
            </div>

            <ol className={styles.list}>
                <li><strong>Browser A ⇄ Browser B</strong> Media goes peer to peer over WebRTC. It never passes through the server.</li>
                <li><strong>Each browser → Node.js API</strong> Socket.IO signalling and REST calls, authenticated with a JWT.</li>
                <li><strong>Node.js API → MongoDB</strong> Users, sessions, meetings, the activity log and recaps.</li>
            </ol>

            <figcaption className={styles.caption}>
                The server authenticates, relays signalling inside one room and keeps the record. It never carries audio or video.
            </figcaption>
        </figure>
    );
}

function Node({ x, y, w, h, name, stack }: { x: number; y: number; w: number; h: number; name: string; stack: string }) {
    return (
        <g>
            <rect x={x} y={y} width={w} height={h} rx="14" className={styles.node} />
            <text x={x + w / 2} y={y + h / 2 - 4} className={styles.nodeName}>{name}</text>
            <text x={x + w / 2} y={y + h / 2 + 22} className={styles.nodeStack}>{stack}</text>
        </g>
    );
}

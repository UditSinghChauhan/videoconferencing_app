import styles from "./ArchitectureFigure.module.css";

/**
 * One figure. At 640 px and up it is a diagram (decorative to screen readers);
 * below that, and always for screen readers, it is the ordered list.
 */
export function ArchitectureFigure() {
    return (
        <figure className={styles.figure}>
            <div className={styles.diagram} aria-hidden="true">
                <div className={styles.peers}>
                    <Node name="Browser A" stack="React · WebRTC" />
                    <div className={styles.media}>
                        <span className={styles.mediaLine} />
                        <span className={styles.label}>media, peer to peer (WebRTC)</span>
                    </div>
                    <Node name="Browser B" stack="React · WebRTC" />
                </div>
                <div className={styles.fork}>
                    <span className={styles.label}>signalling (Socket.IO) and REST, from each browser</span>
                </div>
                <div className={styles.stem} />
                <Node name="Node.js API" stack="Express · Socket.IO · JWT sessions · Zod" wide />
                <div className={`${styles.stem} ${styles.stemLabelled}`}>
                    <span className={styles.label}>reads and writes</span>
                </div>
                <Node name="MongoDB" stack="users · sessions · meetings · activity · recaps" wide />
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

function Node({ name, stack, wide = false }: { name: string; stack: string; wide?: boolean }) {
    return (
        <div className={`${styles.node} ${wide ? styles.wide : ""}`}>
            <strong>{name}</strong>
            <span>{stack}</span>
        </div>
    );
}

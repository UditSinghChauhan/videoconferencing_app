import type { ReactNode } from "react";
import styles from "./AppFrame.module.css";

interface AppFrameProps {
    /** Shown in the window bar, e.g. the room URL. Decorative, hidden from screen readers. */
    address: string;
    /** Controls for the content, placed at the right of the window bar so they never cover it. */
    controls?: ReactNode;
    children: ReactNode;
    className?: string;
}

/** Centred app window around a product capture: one hairline, one shadow, no traffic lights. */
export function AppFrame({ address, controls, children, className }: AppFrameProps) {
    return (
        <div className={[styles.frame, className].filter(Boolean).join(" ")}>
            <div className={styles.bar}>
                <span className={styles.address} aria-hidden="true">{address}</span>
                {controls ? <div className={styles.controls}>{controls}</div> : null}
            </div>
            <div className={styles.screen}>{children}</div>
        </div>
    );
}

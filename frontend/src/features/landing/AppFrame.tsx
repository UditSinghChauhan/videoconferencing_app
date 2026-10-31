import type { ReactNode } from "react";
import styles from "./AppFrame.module.css";

interface AppFrameProps {
    /** Shown in the window bar, e.g. the room URL. Decorative, hidden from screen readers. */
    address: string;
    children: ReactNode;
    className?: string;
}

/** Centred app window around a product capture: one hairline, one shadow, no traffic lights. */
export function AppFrame({ address, children, className }: AppFrameProps) {
    return (
        <div className={[styles.frame, className].filter(Boolean).join(" ")}>
            <div className={styles.bar} aria-hidden="true">
                <span className={styles.address}>{address}</span>
            </div>
            <div className={styles.screen}>{children}</div>
        </div>
    );
}

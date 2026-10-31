import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import styles from "./PageShell.module.css";

export function PageShell({ children, narrow = false }: { children: ReactNode; narrow?: boolean }) {
    return (
        <div className={styles.shell}>
            <AppHeader />
            <main id="main" className={`${styles.main} ${narrow ? styles.narrow : ""}`}>
                {children}
            </main>
        </div>
    );
}

export function PageHeading({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
    return (
        <div className={styles.heading}>
            <div>
                {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
                <h1 className={styles.title}>{title}</h1>
                {description ? <p className={styles.description}>{description}</p> : null}
            </div>
            {actions ? <div className={styles.actions}>{actions}</div> : null}
        </div>
    );
}

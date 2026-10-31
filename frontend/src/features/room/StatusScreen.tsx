import { useEffect, useRef, type ReactNode } from "react";
import { Logo } from "../../components/Logo";
import styles from "./StatusScreen.module.css";

interface StatusScreenProps {
    title: string;
    description: ReactNode;
    actions: ReactNode;
    /** Runs once when the screen appears, e.g. to release camera and mic. */
    onMount?: () => void;
}

/** Full-page outcome for a room link: ended, left, removed, not found. */
export function StatusScreen({ title, description, actions, onMount }: StatusScreenProps) {
    const headingRef = useRef<HTMLHeadingElement>(null);
    const onMountRef = useRef(onMount);

    useEffect(() => {
        onMountRef.current?.();
        headingRef.current?.focus();
    }, []);

    return (
        <div className={styles.screen}>
            <header className={styles.top}>
                <Logo to="/home" />
            </header>
            <main id="main" className={styles.main}>
                <h1 ref={headingRef} tabIndex={-1} className={styles.title}>
                    {title}
                </h1>
                <p className={styles.description}>{description}</p>
                <div className={styles.actions}>{actions}</div>
            </main>
        </div>
    );
}

import { Link } from "react-router-dom";
import styles from "./Logo.module.css";

export function LogoMark({ size = 28 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={styles.mark}>
            <rect width="32" height="32" rx="8" className={styles.markBg} />
            <path d="M7 21.5c0-5 4-9 9-9s9 4 9 9" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
            <path d="M7 21.5h18" className={styles.markDeck} strokeWidth="3" strokeLinecap="round" />
        </svg>
    );
}

export function Logo({ to = "/" }: { to?: string }) {
    return (
        <Link to={to} className={styles.logo} aria-label="Bridge home">
            <LogoMark />
            <span className={styles.word}>Bridge</span>
        </Link>
    );
}

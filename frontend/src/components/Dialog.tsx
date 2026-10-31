import { useEffect, useRef, type ReactNode } from "react";
import styles from "./Dialog.module.css";

interface DialogProps {
    open: boolean;
    title: string;
    description?: ReactNode;
    onClose: () => void;
    children?: ReactNode;
    actions: ReactNode;
    tone?: "light" | "dark";
}

/**
 * Native <dialog> in modal mode: focus trapping, Escape to close and the
 * inert background come from the browser rather than hand-rolled code.
 */
export function Dialog({ open, title, description, onClose, children, actions, tone = "light" }: DialogProps) {
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = ref.current;

        if (!dialog) {
            return;
        }

        if (open && !dialog.open) {
            dialog.showModal();
        } else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open]);

    return (
        <dialog
            ref={ref}
            className={`${styles.dialog} ${tone === "dark" ? styles.dark : ""}`}
            aria-labelledby="dialog-title"
            onClose={onClose}
            onClick={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className={styles.body}>
                <h2 id="dialog-title" className={styles.title}>
                    {title}
                </h2>
                {description ? <p className={styles.description}>{description}</p> : null}
                {children}
                <div className={styles.actions}>{actions}</div>
            </div>
        </dialog>
    );
}

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import styles from "./Field.module.css";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    hint?: ReactNode;
    error?: string | null;
    trailingLabel?: ReactNode;
    hideLabel?: boolean;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
    { label, hint, error, trailingLabel, hideLabel, id, className, ...rest },
    ref
) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const hintId = `${inputId}-hint`;
    const errorId = `${inputId}-error`;
    const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

    return (
        <div className={[styles.field, error && styles.invalid, className].filter(Boolean).join(" ")}>
            <div className={[styles.labelRow, hideLabel && "visually-hidden"].filter(Boolean).join(" ")}>
                <label className={styles.label} htmlFor={inputId}>
                    {label}
                </label>
                {trailingLabel}
            </div>
            <input
                ref={ref}
                id={inputId}
                className={styles.input}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
                {...rest}
            />
            {error ? (
                <p id={errorId} className={styles.error}>
                    {error}
                </p>
            ) : null}
            {hint && !error ? (
                <p id={hintId} className={styles.hint}>
                    {hint}
                </p>
            ) : null}
        </div>
    );
});

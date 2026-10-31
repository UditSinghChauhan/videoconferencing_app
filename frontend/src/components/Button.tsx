import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import styles from "./Button.module.css";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface StyleProps {
    variant?: Variant;
    size?: Size;
    block?: boolean;
    className?: string;
}

const classesFor = ({ variant = "primary", size = "md", block, className }: StyleProps, loading = false) =>
    [styles.button, styles[variant], size !== "md" && styles[size], block && styles.block, loading && styles.loading, className]
        .filter(Boolean)
        .join(" ");

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, StyleProps {
    loading?: boolean;
    icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    { variant, size, block, className, loading = false, icon, children, disabled, type = "button", ...rest },
    ref
) {
    return (
        <button
            ref={ref}
            type={type}
            className={classesFor({ variant, size, block, className }, loading)}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            {...rest}
        >
            <span className={styles.content}>
                {icon}
                {children}
            </span>
            {loading ? (
                <span className={styles.spinner}>
                    <Spinner size={16} />
                </span>
            ) : null}
        </button>
    );
});

interface ButtonLinkProps extends LinkProps, StyleProps {
    icon?: ReactNode;
}

export function ButtonLink({ variant, size, block, className, icon, children, ...rest }: ButtonLinkProps) {
    return (
        <Link className={classesFor({ variant, size, block, className })} {...rest}>
            <span className={styles.content}>
                {icon}
                {children}
            </span>
        </Link>
    );
}

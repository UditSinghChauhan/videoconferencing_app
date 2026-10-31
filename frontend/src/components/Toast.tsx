import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import styles from "./Toast.module.css";

type Tone = "neutral" | "success" | "error";

interface ToastItem {
    id: number;
    message: string;
    tone: Tone;
}

interface ToastContextValue {
    show: (message: string, tone?: Tone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
const AUTO_DISMISS_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const nextId = useRef(0);

    const dismiss = useCallback((id: number) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const show = useCallback((message: string, tone: Tone = "neutral") => {
        nextId.current += 1;
        const id = nextId.current;

        setToasts((current) => {
            // Collapse repeats so a flapping error does not stack up.
            const withoutDuplicate = current.filter((toast) => toast.message !== message);
            return [...withoutDuplicate, { id, message, tone }].slice(-3);
        });
        window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    }, [dismiss]);

    const value = useMemo(() => ({ show }), [show]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className={styles.region} aria-live="polite">
                {toasts.map((toast) => (
                    <div key={toast.id} className={`${styles.toast} ${styles[toast.tone]}`} role={toast.tone === "error" ? "alert" : "status"}>
                        <span>{toast.message}</span>
                        <button type="button" className={styles.close} onClick={() => dismiss(toast.id)} aria-label="Dismiss notification">
                            <X size={16} aria-hidden="true" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast(): ToastContextValue {
    const context = useContext(ToastContext);

    if (!context) {
        throw new Error("useToast must be used inside <ToastProvider>");
    }

    return context;
}

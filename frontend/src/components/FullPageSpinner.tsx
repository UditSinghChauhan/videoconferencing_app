import { Spinner } from "./Spinner";

export function FullPageSpinner({ label }: { label: string }) {
    return (
        <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", color: "var(--text-muted)" }}>
            <div style={{ display: "grid", justifyItems: "center", gap: "var(--space-3)" }}>
                <Spinner size={24} label={label} />
                <span style={{ fontSize: "var(--text-sm)" }}>{label}…</span>
            </div>
        </div>
    );
}

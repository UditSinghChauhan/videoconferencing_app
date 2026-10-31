import { avatarColorFor, initialsFor } from "../lib/format";

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
    return (
        <span
            aria-hidden="true"
            style={{
                width: size,
                height: size,
                flex: "none",
                borderRadius: "50%",
                display: "inline-grid",
                placeItems: "center",
                background: avatarColorFor(name),
                color: "#fff",
                fontSize: Math.max(11, Math.round(size * 0.38)),
                fontWeight: 600,
                letterSpacing: "0.02em",
                userSelect: "none"
            }}
        >
            {initialsFor(name)}
        </span>
    );
}

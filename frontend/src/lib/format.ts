const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** "45 min", "1 h 05 min", "under a minute". */
export const formatDuration = (ms: number | null | undefined): string | null => {
    if (ms == null || Number.isNaN(ms)) {
        return null;
    }

    if (ms < MINUTE) {
        return "under a minute";
    }

    const hours = Math.floor(ms / HOUR);
    const minutes = Math.floor((ms % HOUR) / MINUTE);

    if (hours === 0) {
        return `${minutes} min`;
    }

    return `${hours} h ${String(minutes).padStart(2, "0")} min`;
};

/** Live call timer: "4:09", "1:02:33". */
export const formatElapsed = (ms: number): string => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const mm = hours > 0 ? String(minutes).padStart(2, "0") : String(minutes);
    const ss = String(seconds).padStart(2, "0");

    return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
};

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

export const formatDateTime = (value: string | Date): string => dateFormatter.format(new Date(value));
export const formatTime = (value: string | Date): string => timeFormatter.format(new Date(value));

/** "just now", "12 minutes ago", "yesterday", then an absolute date after a week. */
export const formatRelative = (value: string | Date, now: Date = new Date()): string => {
    const diffMs = new Date(value).getTime() - now.getTime();
    const absMs = Math.abs(diffMs);

    if (absMs < MINUTE) {
        return "just now";
    }

    if (absMs < HOUR) {
        return relativeFormatter.format(Math.round(diffMs / MINUTE), "minute");
    }

    if (absMs < 24 * HOUR) {
        return relativeFormatter.format(Math.round(diffMs / HOUR), "hour");
    }

    if (absMs < 7 * 24 * HOUR) {
        return relativeFormatter.format(Math.round(diffMs / (24 * HOUR)), "day");
    }

    return formatDateTime(value);
};

export const initialsFor = (name: string): string => {
    const parts = name.trim().split(/[\s_.-]+/).filter(Boolean);

    if (parts.length === 0) {
        return "?";
    }

    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
    return (first + last).toUpperCase();
};

const AVATAR_HUES = ["#8a5a44", "#4f6d5a", "#566c8f", "#7a5c86", "#8c6d2f", "#4d7480"] as const;

/** Stable, muted colour per name so a person looks the same everywhere. */
export const avatarColorFor = (name: string): string => {
    let hash = 0;

    for (const char of name) {
        hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    }

    return AVATAR_HUES[hash % AVATAR_HUES.length] ?? AVATAR_HUES[0];
};

export const pluralize = (count: number, singular: string, plural = `${singular}s`): string =>
    `${count} ${count === 1 ? singular : plural}`;

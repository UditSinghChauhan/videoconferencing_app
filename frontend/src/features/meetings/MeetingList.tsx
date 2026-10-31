import { Link } from "react-router-dom";
import { ArrowUpRight, FileText, RotateCw } from "lucide-react";
import { Button, ButtonLink } from "../../components/Button";
import { formatDuration, formatRelative, pluralize } from "../../lib/format";
import type { Meeting } from "../../lib/types";
import styles from "./MeetingList.module.css";

export function MeetingListSkeleton({ rows = 3 }: { rows?: number }) {
    return (
        <ul className={styles.list} aria-busy="true" aria-label="Loading meetings">
            {Array.from({ length: rows }, (_, index) => (
                <li key={index} className={`${styles.row} ${styles.skeletonRow}`}>
                    <span className={styles.skeleton} style={{ width: 140 }} />
                    <span className={styles.skeleton} style={{ width: 220 }} />
                </li>
            ))}
        </ul>
    );
}

export function MeetingListError({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <div className={styles.state} role="alert">
            <strong>Couldn't load meetings</strong>
            <p>{message}</p>
            <Button variant="secondary" size="sm" icon={<RotateCw size={14} aria-hidden="true" />} onClick={onRetry}>
                Try again
            </Button>
        </div>
    );
}

export function MeetingListEmpty({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
    return (
        <div className={styles.state}>
            <strong>{title}</strong>
            <p>{description}</p>
            {action}
        </div>
    );
}

const describe = (meeting: Meeting) => {
    const parts: string[] = [];
    const people = meeting.participantCount ?? meeting.participants.length;
    if (people) parts.push(pluralize(people, "person", "people"));
    const duration = formatDuration(meeting.durationMs);
    if (meeting.status === "ended" && duration) parts.push(duration);
    if (meeting.currentUserRole === "host" || meeting.hostUsername) {
        parts.push(meeting.status === "active" && meeting.currentUserRole === "host" ? "You're hosting" : `Host @${meeting.hostUsername}`);
    }
    return parts.join(" · ");
};

export function MeetingList({ meetings }: { meetings: Meeting[] }) {
    return (
        <ul className={styles.list}>
            {meetings.map((meeting) => {
                const isLive = meeting.status === "active";
                const href = isLive ? `/room/${encodeURIComponent(meeting.meetingId)}` : `/meetings/${encodeURIComponent(meeting.meetingId)}`;

                return (
                    <li key={meeting.id ?? meeting.meetingId} className={styles.row}>
                        <div className={styles.primary}>
                            <Link to={href} className={styles.code}>
                                {meeting.meetingId}
                            </Link>
                            <span className={isLive ? styles.live : styles.ended}>{isLive ? "Live" : "Ended"}</span>
                        </div>
                        <div className={styles.meta}>
                            <time dateTime={meeting.updatedAt}>{formatRelative(meeting.endedAt ?? meeting.updatedAt)}</time>
                            <span>{describe(meeting)}</span>
                        </div>
                        <div className={styles.action}>
                            {isLive ? (
                                <ButtonLink to={href} size="sm" variant="secondary" icon={<ArrowUpRight size={14} aria-hidden="true" />}>
                                    Rejoin
                                </ButtonLink>
                            ) : (
                                <ButtonLink to={href} size="sm" variant="ghost" icon={<FileText size={14} aria-hidden="true" />}>
                                    Recap
                                </ButtonLink>
                            )}
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

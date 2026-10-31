import { useMemo, useState } from "react";
import { ButtonLink } from "../components/Button";
import { PageHeading, PageShell } from "../components/PageShell";
import { MeetingList, MeetingListEmpty, MeetingListError, MeetingListSkeleton } from "../features/meetings/MeetingList";
import { useMeetingHistory } from "../features/meetings/useMeetingHistory";
import styles from "./HistoryPage.module.css";

type Filter = "all" | "active" | "ended";

const FILTERS: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "active", label: "Live" },
    { id: "ended", label: "Ended" }
];

export default function HistoryPage() {
    const { state, reload } = useMeetingHistory();
    const [filter, setFilter] = useState<Filter>("all");

    const meetings = useMemo(() => {
        if (state.status !== "success") return [];
        return filter === "all" ? state.meetings : state.meetings.filter((meeting) => meeting.status === filter);
    }, [filter, state]);

    const counts = useMemo(() => {
        const all = state.status === "success" ? state.meetings : [];
        return {
            all: all.length,
            active: all.filter((m) => m.status === "active").length,
            ended: all.filter((m) => m.status === "ended").length
        };
    }, [state]);

    return (
        <PageShell>
            <PageHeading
                title="History"
                description="Every meeting you hosted or joined. Open an ended meeting to read its recap and chat transcript."
                actions={<ButtonLink to="/home">New meeting</ButtonLink>}
            />

            <div className={styles.filters} role="group" aria-label="Filter meetings">
                {FILTERS.map(({ id, label }) => (
                    <button
                        key={id}
                        type="button"
                        className={styles.filter}
                        aria-pressed={filter === id}
                        onClick={() => setFilter(id)}
                    >
                        {label}
                        {state.status === "success" ? <span className="tabular">{counts[id]}</span> : null}
                    </button>
                ))}
            </div>

            {state.status === "loading" ? <MeetingListSkeleton rows={6} /> : null}
            {state.status === "error" ? <MeetingListError message={state.message} onRetry={reload} /> : null}
            {state.status === "success" && meetings.length === 0 ? (
                <MeetingListEmpty
                    title={filter === "all" ? "No meetings yet" : filter === "active" ? "Nothing live right now" : "No ended meetings yet"}
                    description={filter === "all"
                        ? "Meetings you host or join show up here, with a recap once they end."
                        : "Switch to All to see every meeting."}
                    action={filter === "all" ? <ButtonLink to="/home" size="sm">Start a meeting</ButtonLink> : null}
                />
            ) : null}
            {meetings.length > 0 ? <MeetingList meetings={meetings} /> : null}
        </PageShell>
    );
}

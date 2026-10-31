import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Plus } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Button, ButtonLink } from "../components/Button";
import { Field } from "../components/Field";
import { PageShell } from "../components/PageShell";
import { MeetingList, MeetingListEmpty, MeetingListError, MeetingListSkeleton } from "../features/meetings/MeetingList";
import { useMeetingHistory } from "../features/meetings/useMeetingHistory";
import { getErrorMessage, meetingsApi } from "../lib/api";
import { parseMeetingInput } from "../lib/meetingCode";
import styles from "./DashboardPage.module.css";

const greeting = (date = new Date()) => {
    const hour = date.getHours();
    if (hour < 5) return "Working late";
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
};

export default function DashboardPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { state, reload } = useMeetingHistory();
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [code, setCode] = useState("");
    const [codeError, setCodeError] = useState<string | null>(null);

    const startMeeting = async () => {
        setCreating(true);
        setCreateError(null);
        try {
            const meeting = await meetingsApi.create();
            navigate(`/room/${encodeURIComponent(meeting.meetingId)}`);
        } catch (error) {
            setCreateError(getErrorMessage(error, "Couldn't start a meeting. Try again."));
            setCreating(false);
        }
    };

    const joinMeeting = (event: FormEvent) => {
        event.preventDefault();
        const meetingId = parseMeetingInput(code);

        if (!meetingId) {
            setCodeError(code.trim() ? "That isn't a valid code or link. Codes look like kmt-vrqp-xhw." : "Enter a code or paste an invite link.");
            return;
        }

        navigate(`/room/${encodeURIComponent(meetingId)}`);
    };

    const firstName = (user?.name || user?.username || "").split(" ")[0];
    const live = state.status === "success" ? state.meetings.filter((meeting) => meeting.status === "active") : [];
    const recent = state.status === "success" ? state.meetings.slice(0, 5) : [];

    return (
        <PageShell>
            <section className={styles.hero} aria-labelledby="dashboard-title">
                <p className={styles.eyebrow}>{greeting()}, {firstName}</p>
                <h1 id="dashboard-title" className={styles.title}>Start a call, or pick up where you left off.</h1>

                <div className={styles.actions}>
                    <div className={styles.startCard}>
                        <h2>New meeting</h2>
                        <p>Get a link you can share. Your room stays open until you end it.</p>
                        <Button size="lg" onClick={startMeeting} loading={creating} icon={<Plus size={18} aria-hidden="true" />} data-testid="new-meeting-button">
                            New meeting
                        </Button>
                        {createError ? <p className={styles.error} role="alert">{createError}</p> : null}
                    </div>

                    <form className={styles.joinCard} onSubmit={joinMeeting} noValidate>
                        <h2>Join with a code</h2>
                        <div className={styles.joinRow}>
                            <Field
                                label="Meeting code or link"
                                hideLabel
                                placeholder="kmt-vrqp-xhw or invite link"
                                autoComplete="off"
                                autoCapitalize="none"
                                spellCheck={false}
                                value={code}
                                onChange={(event) => {
                                    setCode(event.target.value);
                                    setCodeError(null);
                                }}
                                error={codeError}
                                hint="Paste the full invite link or just the code."
                                data-testid="meeting-code-input"
                            />
                            <Button type="submit" variant="secondary" size="lg" icon={<ArrowRight size={18} aria-hidden="true" />}>
                                Join
                            </Button>
                        </div>
                    </form>
                </div>
            </section>

            {live.length > 0 ? (
                <section className={styles.section} aria-labelledby="live-title">
                    <h2 id="live-title" className={styles.sectionTitle}>Happening now</h2>
                    <MeetingList meetings={live} />
                </section>
            ) : null}

            <section className={styles.section} aria-labelledby="recent-title">
                <div className={styles.sectionHeader}>
                    <h2 id="recent-title" className={styles.sectionTitle}>Recent meetings</h2>
                    {state.status === "success" && state.meetings.length > 5 ? <Link to="/history" className={styles.viewAll}>View all</Link> : null}
                </div>
                {state.status === "loading" ? <MeetingListSkeleton /> : null}
                {state.status === "error" ? <MeetingListError message={state.message} onRetry={reload} /> : null}
                {state.status === "success" && recent.length === 0 ? (
                    <MeetingListEmpty
                        title="No meetings yet"
                        description="Start a meeting and share the link. Ended meetings appear here with their recap."
                        action={<ButtonLink to="/demo" variant="secondary" size="sm">See a sample meeting</ButtonLink>}
                    />
                ) : null}
                {recent.length > 0 ? <MeetingList meetings={recent} /> : null}
            </section>
        </PageShell>
    );
}

import { useCallback, useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Check, ClipboardCopy, RotateCw } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { Button, ButtonLink } from "../components/Button";
import { PageShell } from "../components/PageShell";
import { recapToMarkdown } from "../features/meetings/recapMarkdown";
import { getErrorMessage, getErrorStatus, meetingsApi } from "../lib/api";
import { formatDateTime, formatDuration, formatTime, pluralize } from "../lib/format";
import type { MeetingRecap } from "../lib/types";
import styles from "./RecapPage.module.css";

type RecapState =
    | { status: "loading" }
    | { status: "error"; message: string; notFound: boolean }
    | { status: "success"; recap: MeetingRecap };

export default function RecapPage() {
    const { meetingId = "" } = useParams();
    const location = useLocation();
    const justEnded = Boolean((location.state as { justEnded?: boolean } | null)?.justEnded);
    const [state, setState] = useState<RecapState>({ status: "loading" });
    const [copied, setCopied] = useState(false);

    const load = useCallback(async () => {
        setState({ status: "loading" });
        try {
            setState({ status: "success", recap: await meetingsApi.recap(meetingId) });
        } catch (error) {
            const status = getErrorStatus(error);
            setState({
                status: "error",
                notFound: status === 404 || status === 403,
                message: status === 403
                    ? "Only people who were in this meeting can see its recap."
                    : getErrorMessage(error, "Couldn't load this recap.")
            });
        }
    }, [meetingId]);

    useEffect(() => {
        void load();
    }, [load]);

    const back = (
        <ButtonLink to="/history" variant="ghost" size="sm" icon={<ArrowLeft size={16} aria-hidden="true" />} className={styles.back}>
            History
        </ButtonLink>
    );

    if (state.status === "loading") {
        return (
            <PageShell narrow>
                {back}
                <div className={styles.loading} aria-busy="true" aria-label="Loading recap">
                    <span className={styles.skeleton} style={{ width: "40%", height: 40 }} />
                    <span className={styles.skeleton} style={{ width: "70%" }} />
                    <span className={styles.skeleton} style={{ width: "100%", height: 120 }} />
                    <span className={styles.skeleton} style={{ width: "100%", height: 160 }} />
                </div>
            </PageShell>
        );
    }

    if (state.status === "error") {
        return (
            <PageShell narrow>
                {back}
                <div className={styles.errorState} role="alert">
                    <h1>{state.notFound ? "Recap not available" : "Couldn't load the recap"}</h1>
                    <p>{state.message}</p>
                    {!state.notFound ? (
                        <Button variant="secondary" icon={<RotateCw size={16} aria-hidden="true" />} onClick={load}>Try again</Button>
                    ) : null}
                </div>
            </PageShell>
        );
    }

    const { recap } = state;
    const { summary } = recap;

    if (recap.status === "active") {
        return (
            <PageShell narrow>
                {back}
                <div className={styles.errorState}>
                    <h1>This meeting is still live</h1>
                    <p>The recap is generated when the host ends the meeting.</p>
                    <ButtonLink to={`/room/${encodeURIComponent(recap.meetingId)}`}>Rejoin meeting</ButtonLink>
                </div>
            </PageShell>
        );
    }

    const copyRecap = async () => {
        try {
            await navigator.clipboard.writeText(recapToMarkdown(recap));
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    const duration = formatDuration(recap.durationMs);
    const transcript = recap.chat ?? [];
    const hasContent = summary.keyPoints.length > 0 || summary.highlights.length > 0;

    return (
        <PageShell narrow>
            {back}
            <article className={styles.recap}>
                <header className={styles.header}>
                    {justEnded ? <p className={styles.notice} role="status">Meeting ended. Here's the recap.</p> : null}
                    <p className={styles.code}>{recap.meetingId}</p>
                    <h1 className={styles.title}>Meeting recap</h1>
                    <dl className={styles.facts}>
                        {recap.createdAt ? (<div><dt>Date</dt><dd>{formatDateTime(recap.createdAt)}</dd></div>) : null}
                        {duration ? (<div><dt>Duration</dt><dd>{duration}</dd></div>) : null}
                        {recap.participantCount ? (<div><dt>People</dt><dd>{pluralize(recap.participantCount, "person", "people")}</dd></div>) : null}
                        {recap.hostUsername ? (<div><dt>Host</dt><dd>@{recap.hostUsername}</dd></div>) : null}
                    </dl>
                    <div className={styles.headerActions}>
                        <Button variant="secondary" size="sm" onClick={copyRecap} icon={copied ? <Check size={14} aria-hidden="true" /> : <ClipboardCopy size={14} aria-hidden="true" />}>
                            {copied ? "Copied" : "Copy as Markdown"}
                        </Button>
                    </div>
                </header>

                {summary.conclusion ? <p className={styles.conclusion}>{summary.conclusion}</p> : null}

                {!hasContent ? (
                    <div className={styles.emptyRecap}>
                        <strong>Not much to recap</strong>
                        <p>Bridge builds recaps from chat messages and meeting activity. This call had no chat, so there are no key points.</p>
                    </div>
                ) : null}

                {summary.keyPoints.length ? (
                    <section className={styles.section} aria-labelledby="key-points">
                        <h2 id="key-points">Key points</h2>
                        <ol className={styles.points}>
                            {summary.keyPoints.map((point, index) => <li key={`${index}-${point}`}>{point}</li>)}
                        </ol>
                    </section>
                ) : null}

                <div className={styles.columns}>
                    {summary.highlights.length ? (
                        <section className={styles.section} aria-labelledby="highlights">
                            <h2 id="highlights">What happened</h2>
                            <ul className={styles.timeline}>
                                {summary.highlights.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
                            </ul>
                        </section>
                    ) : null}

                    <section className={styles.section} aria-labelledby="people">
                        <h2 id="people">Who was there</h2>
                        {summary.participantsInvolved.length ? (
                            <ul className={styles.people}>
                                {summary.participantsInvolved.map((name) => (
                                    <li key={name}><Avatar name={name} size={28} /> {name}</li>
                                ))}
                            </ul>
                        ) : <p className={styles.muted}>No participant activity was recorded.</p>}
                        {summary.keywords.length ? (
                            <>
                                <h3 className={styles.subheading}>Topics</h3>
                                <ul className={styles.chips}>
                                    {summary.keywords.map((keyword) => <li key={keyword}>{keyword}</li>)}
                                </ul>
                            </>
                        ) : null}
                    </section>
                </div>

                {transcript.length ? (
                    <details className={styles.transcript}>
                        <summary>Chat transcript · {pluralize(transcript.length, "message")}</summary>
                        <ol>
                            {transcript.map((entry, index) => (
                                <li key={`${index}-${entry.sentAt}`}>
                                    <time dateTime={entry.sentAt}>{formatTime(entry.sentAt)}</time>
                                    <strong>{entry.sender}</strong>
                                    <span>{entry.content}</span>
                                </li>
                            ))}
                        </ol>
                    </details>
                ) : null}

                <p className={styles.footnote}>
                    Recaps are generated on the server from chat and activity using keyword frequency and sentence scoring. No audio is recorded and no external AI service is used.
                </p>
            </article>
        </PageShell>
    );
}

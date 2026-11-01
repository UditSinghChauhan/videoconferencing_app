import { useState, type ReactNode } from "react";
import { Check, ClipboardCopy } from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { Button } from "../../components/Button";
import { formatDateTime, formatDuration, formatTime, pluralize } from "../../lib/format";
import type { MeetingRecap } from "../../lib/types";
import { recapToMarkdown } from "./recapMarkdown";
import styles from "./Recap.module.css";

interface RecapViewProps {
    recap: MeetingRecap;
    /** Status line above the title, e.g. "Meeting ended. Here's the recap." */
    notice?: ReactNode;
    /** Replaces the default note about how recaps are generated. */
    footnote?: ReactNode;
    /** Open the transcript by default (the demo shows it straight away). */
    transcriptOpen?: boolean;
}

type CopyState = "idle" | "copied" | "failed";

/** The recap of an ended meeting. Shared by the recap page and the public demo. */
export function RecapView({ recap, notice, footnote, transcriptOpen = false }: RecapViewProps) {
    const [copy, setCopy] = useState<CopyState>("idle");
    const { summary } = recap;

    const copyRecap = async () => {
        try {
            await navigator.clipboard.writeText(recapToMarkdown(recap));
            setCopy("copied");
        } catch (error) {
            console.warn("Copying the recap failed", error);
            setCopy("failed");
        }
        window.setTimeout(() => setCopy("idle"), 2000);
    };

    const duration = formatDuration(recap.durationMs);
    const transcript = recap.chat ?? [];
    const hasContent = summary.keyPoints.length > 0 || summary.highlights.length > 0;

    return (
        <article className={styles.recap} data-testid="recap">
            <header className={styles.header}>
                {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
                <p className={styles.code}>{recap.meetingId}</p>
                <h1 className={styles.title}>Meeting recap</h1>
                <dl className={styles.facts}>
                    {recap.createdAt ? (<div><dt>Date</dt><dd>{formatDateTime(recap.createdAt)}</dd></div>) : null}
                    {duration ? (<div><dt>Duration</dt><dd>{duration}</dd></div>) : null}
                    {recap.participantCount ? (<div><dt>People</dt><dd>{pluralize(recap.participantCount, "person", "people")}</dd></div>) : null}
                    {recap.hostUsername ? (<div><dt>Host</dt><dd>@{recap.hostUsername}</dd></div>) : null}
                </dl>
                <div className={styles.headerActions}>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={copyRecap}
                        icon={copy === "copied" ? <Check size={14} aria-hidden="true" /> : <ClipboardCopy size={14} aria-hidden="true" />}
                    >
                        {copy === "copied" ? "Copied" : copy === "failed" ? "Copy failed, select the text instead" : "Copy as Markdown"}
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
                <details className={styles.transcript} open={transcriptOpen}>
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
                {footnote ?? "Recaps are generated on the server from chat and activity using keyword frequency and sentence scoring. No audio is recorded and no external AI service is used."}
            </p>
        </article>
    );
}

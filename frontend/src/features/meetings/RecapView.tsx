import { useState, type ReactNode } from "react";
import { Check, ClipboardCopy, Users } from "lucide-react";
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
    /** Build the recap in line by line, right after the host ends the call. */
    reveal?: boolean;
}

type CopyState = "idle" | "copied" | "failed";

/** An owner or speaker: avatar plus first name. "Everyone" gets a group mark instead of initials. */
export function PersonChip({ name }: { name: string }) {
    const everyone = name === "Everyone";
    return (
        <span className={styles.person}>
            {everyone ? (
                <span className={styles.everyone} aria-hidden="true"><Users size={12} /></span>
            ) : (
                <Avatar name={name} size={20} />
            )}
            <span>{everyone ? "Everyone" : name}</span>
        </span>
    );
}

/** The recap of an ended meeting. Shared by the recap page and the public demo. */
export function RecapView({ recap, notice, footnote, transcriptOpen = false, reveal = false }: RecapViewProps) {
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
    const actionItems = summary.actionItems ?? [];
    const hasContent = summary.keyPoints.length > 0 || actionItems.length > 0;
    const host = recap.hostName ?? null;

    return (
        <article className={styles.recap} data-testid="recap" data-reveal={reveal || undefined}>
            <header className={styles.header}>
                {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
                <p className={styles.code}>{recap.meetingId}</p>
                <h1 className={styles.title}>Meeting recap</h1>
                <dl className={styles.facts}>
                    {recap.createdAt ? (<div><dt>Date</dt><dd>{formatDateTime(recap.createdAt)}</dd></div>) : null}
                    {duration ? (<div><dt>Duration</dt><dd>{duration}</dd></div>) : null}
                    {recap.participantCount ? (<div><dt>People</dt><dd>{pluralize(recap.participantCount, "person", "people")}</dd></div>) : null}
                    {host ? (<div><dt>Host</dt><dd>{host}</dd></div>) : null}
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
                    <p>Bridge builds recaps from what people write in the chat. This call had no messages to work from, so there are no action items or key points.</p>
                </div>
            ) : null}

            {actionItems.length ? (
                <section className={styles.section} aria-labelledby="action-items">
                    <h2 id="action-items">Action items</h2>
                    <ul className={styles.actions}>
                        {actionItems.map((item, index) => (
                            <li key={`${index}-${item.task}`}>
                                <span className={styles.box} aria-hidden="true" />
                                <span className={styles.task}>{item.task}</span>
                                <PersonChip name={item.owner} />
                                {item.due ? <span className={styles.due}>{item.due}</span> : null}
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}

            {summary.keyPoints.length ? (
                <section className={styles.section} aria-labelledby="key-points">
                    <h2 id="key-points">Key points</h2>
                    <ul className={styles.points}>
                        {summary.keyPoints.map((point, index) => (
                            <li key={`${index}-${point.text}`}>
                                <p>{point.text}</p>
                                {point.speaker ? <PersonChip name={point.speaker} /> : null}
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}

            {summary.keywords.length ? (
                <section className={styles.section} aria-labelledby="topics">
                    <h2 id="topics">Topics</h2>
                    <ul className={styles.chips}>
                        {summary.keywords.map((keyword) => <li key={keyword}>{keyword}</li>)}
                    </ul>
                </section>
            ) : null}

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
                {footnote ?? "Recaps are written on the server from the chat by fixed rules: commitments become action items, recurring phrases become topics. No audio is recorded and no external AI service is used."}
            </p>
        </article>
    );
}

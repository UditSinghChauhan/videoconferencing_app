import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, Copy, MicOff, SendHorizontal, UserMinus, X } from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { formatTime } from "../../lib/format";
import type { ChatMessage } from "../../lib/types";
import styles from "./SidePanel.module.css";

export interface PersonModel {
    id: string;
    name: string;
    username?: string;
    isHost: boolean;
    isYou: boolean;
    micOn: boolean | null;
}

function PanelShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <aside className={styles.panel} aria-label={title}>
            <header className={styles.header}>
                <h2>{title}</h2>
                <button type="button" className={styles.close} onClick={onClose} aria-label={`Close ${title.toLowerCase()}`}>
                    <X size={18} aria-hidden="true" />
                </button>
            </header>
            {children}
        </aside>
    );
}

export function ChatPanel({
    messages,
    onSend,
    onClose,
    disabled
}: {
    messages: ChatMessage[];
    onSend: (text: string) => void;
    onClose: () => void;
    disabled?: boolean;
}) {
    const [draft, setDraft] = useState("");
    const listRef = useRef<HTMLOListElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        const list = listRef.current;
        if (list) {
            list.scrollTop = list.scrollHeight;
        }
    }, [messages.length]);

    const submit = (event?: FormEvent) => {
        event?.preventDefault();
        const text = draft.trim();
        if (!text || disabled) return;
        onSend(text);
        setDraft("");
    };

    return (
        <PanelShell title="Chat" onClose={onClose}>
            <ol ref={listRef} className={styles.messages} aria-live="polite" aria-relevant="additions" data-testid="chat-log">
                {messages.length === 0 ? (
                    <li className={styles.emptyChat}>
                        <strong>No messages yet</strong>
                        <span>Messages are visible to everyone in the call and feed the meeting recap.</span>
                    </li>
                ) : null}
                {messages.map((message, index) => {
                    const previous = messages[index - 1];
                    const grouped = previous?.sender === message.sender;

                    return (
                        <li key={message.id} className={[styles.message, message.isOwn && styles.own, grouped && styles.grouped].filter(Boolean).join(" ")}>
                            {!grouped ? (
                                <div className={styles.meta}>
                                    <strong>{message.isOwn ? "You" : message.sender}</strong>
                                    <time dateTime={message.sentAt}>{formatTime(message.sentAt)}</time>
                                </div>
                            ) : null}
                            <p className={styles.bubble}>{message.text}</p>
                        </li>
                    );
                })}
            </ol>
            <form className={styles.composer} onSubmit={submit}>
                <label htmlFor="chat-input" className="visually-hidden">
                    Message everyone
                </label>
                <textarea
                    id="chat-input"
                    ref={inputRef}
                    rows={1}
                    maxLength={2000}
                    value={draft}
                    disabled={disabled}
                    placeholder={disabled ? "The host turned off chat" : "Message everyone"}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                            event.preventDefault();
                            submit();
                        }
                    }}
                />
                <button type="submit" className={styles.send} disabled={disabled || !draft.trim()} aria-label="Send message">
                    <SendHorizontal size={18} aria-hidden="true" />
                </button>
            </form>
        </PanelShell>
    );
}

export function PeoplePanel({
    people,
    inviteLink,
    canRemove,
    removingId,
    onRemove,
    onClose
}: {
    people: PersonModel[];
    inviteLink: string;
    canRemove: boolean;
    removingId: string | null;
    onRemove: (person: PersonModel) => void;
    onClose: () => void;
}) {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    return (
        <PanelShell title="People" onClose={onClose}>
            <div className={styles.invite}>
                <span>Invite others with this link</span>
                <div className={styles.inviteRow}>
                    <code>{inviteLink.replace(/^https?:\/\//, "")}</code>
                    <button type="button" onClick={copy} className={styles.copy} aria-label="Copy invite link">
                        {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                    </button>
                </div>
                <span className={styles.liveCopied} aria-live="polite">{copied ? "Link copied" : ""}</span>
            </div>
            <p className={styles.sectionLabel}>In this call · {people.length}</p>
            <ul className={styles.people} data-testid="participant-roster">
                {people.map((person) => (
                    <li key={person.id} className={styles.person}>
                        <Avatar name={person.name} size={32} />
                        <div className={styles.personText}>
                            <strong data-testid="roster-name">
                                {person.name}
                                {person.isYou ? <span className={styles.you}> (you)</span> : null}
                            </strong>
                            <span>{person.isHost ? "Host" : "Participant"}</span>
                        </div>
                        {person.micOn === false ? (
                            <MicOff size={16} className={styles.mutedIcon} aria-label="Muted" role="img" />
                        ) : null}
                        {canRemove && !person.isHost && !person.isYou ? (
                            <button
                                type="button"
                                className={styles.remove}
                                onClick={() => onRemove(person)}
                                disabled={removingId === person.id}
                                aria-label={`Remove ${person.name} from the call`}
                            >
                                <UserMinus size={16} aria-hidden="true" />
                            </button>
                        ) : null}
                    </li>
                ))}
            </ul>
        </PanelShell>
    );
}

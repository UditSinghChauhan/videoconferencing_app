const STOP_WORDS = new Set([
    "the", "and", "for", "that", "this", "with", "have", "from", "were", "your", "into", "about", "there",
    "their", "will", "would", "could", "should", "what", "when", "where", "which", "while", "been", "being",
    "them", "they", "then", "than", "just", "some", "very", "more", "most", "also", "only", "over", "under",
    "after", "before", "because", "through", "during", "each", "such", "our", "out", "are", "was", "but",
    "not", "you", "all", "can", "has", "had", "let", "lets", "its", "it's", "a", "an", "to", "of", "in", "on", "is", "it",
    // Conversational filler that dominates chat but says nothing about the topic.
    "sounds", "sound", "good", "great", "nice", "okay", "yeah", "yes", "sure", "thanks", "thank", "think", "know",
    "like", "really", "maybe", "right", "well", "going", "gonna", "want", "make", "here", "everyone", "today",
    "i'll", "we'll", "i'm", "we're", "that's", "don't", "can't", "does", "doing", "done", "said", "says", "okay"
]);

const normalizeText = (value = "") => value.replace(/\s+/g, " ").trim();

const scoreSentence = (sentence) => {
    let score = 0;

    if (sentence.length >= 40) score += 2;
    if (/[.!?]$/.test(sentence)) score += 1;
    if (/\b(decide|action|next|follow up|deadline|ship|issue|plan|summary|important|need|should|must|todo)\b/i.test(sentence)) score += 3;

    return score;
};

// ---------------------------------------------------------------------------
// Topics: short noun phrases ("release checklist", "onboarding bug"), never the
// verbs, labels and filler that dominate chat. Deterministic, no external AI:
// tokens are classified with word lists and suffix rules, runs of noun-like
// tokens become phrases, and phrases are ranked by how often they and their
// words recur.
// ---------------------------------------------------------------------------

const MAX_TOPICS = 5;

/** Function words, filler, time words and meeting meta-words: never part of a topic. */
const TOPIC_STOP_WORDS = new Set([
    ...STOP_WORDS,
    // Pronouns, determiners, prepositions, conjunctions.
    "i", "me", "we", "us", "he", "she", "him", "her", "his", "hers", "my", "mine", "ours", "yours", "theirs",
    "these", "those", "any", "both", "either", "neither", "every", "other", "another", "same", "own",
    "at", "by", "up", "down", "off", "as", "if", "or", "so", "nor", "yet", "via", "per", "with", "without",
    "within", "between", "below", "above", "across", "along", "around", "against", "until", "since", "though",
    "although", "unless", "whether", "who", "whom", "whose", "why", "how", "too", "again", "still", "even",
    "ever", "never", "always", "often", "soon", "now", "later", "already", "almost", "much", "many", "few",
    "lot", "lots", "bit", "something", "anything", "nothing", "everything", "someone", "anyone", "everybody",
    // Auxiliaries and modals.
    "am", "be", "do", "did", "does", "get", "got", "gets", "may", "might", "must", "shall", "ought", "isn't",
    "aren't", "wasn't", "weren't", "won't", "wouldn't", "shouldn't", "couldn't", "didn't", "doesn't", "haven't",
    // Number words and order.
    "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "first", "second", "third",
    "last", "final", "half", "both",
    // Time words: when something happens is not what it is about.
    "tomorrow", "tonight", "yesterday", "morning", "afternoon", "evening", "noon", "lunch", "week", "weeks",
    "month", "months", "year", "day", "days", "hour", "hours", "minute", "minutes", "time", "eod", "asap",
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "weekend",
    // Meeting meta-words and chat labels ("Agenda:", "Decision:", "Next step:").
    "agenda", "decision", "decisions", "step", "steps", "next", "item", "items", "action", "actions", "point",
    "points", "thing", "things", "stuff", "meeting", "meetings", "call", "calls", "question", "questions",
    "note", "notes", "idea", "ideas", "way", "part", "kind", "sort", "team", "folks", "guys", "people",
    // Evaluative and filler adjectives or adverbs.
    "fine", "firm", "ready", "awesome", "cool", "perfect", "bad", "better", "best", "worse", "big", "small",
    "quick", "quickly", "new", "old", "able", "sorry", "please", "hey", "hello", "hi", "ok", "agree", "catch",
    "true", "false", "real", "actually", "basically", "probably", "definitely", "totally", "pretty", "enough",
    "once", "twice", "overnight", "daily", "weekly", "anyway", "instead"
]);

/** Words that are verbs in almost every chat sentence. A determiner in front ("the fix") makes them nouns. */
const VERBS = new Set([
    "own", "merge", "ship", "follow", "update", "look", "feel", "seem", "start", "shorten", "move", "fix", "add",
    "alert", "schedule", "need", "sign", "take", "share", "send", "check", "push", "pull", "drop", "put", "run",
    "try", "keep", "talk", "say", "tell", "ask", "help", "use", "make", "find", "give", "come", "go", "see",
    "write", "read", "close", "open", "cut", "set", "discuss", "decide", "finish", "handle", "deploy", "roll",
    "pick", "join", "leave", "wait", "hold", "bring", "build", "change", "remove", "copy", "test", "clean",
    "post", "drop", "land", "announce", "confirm", "assign", "block", "unblock", "approve", "review"
]);

const DETERMINERS = new Set(["the", "a", "an", "this", "that", "these", "those", "our", "my", "your", "their", "his", "her", "its", "each", "every", "no", "any"]);

/** Singular key, so "candidate" and "candidates" count as one topic. */
const lemma = (word) => {
    if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
    if (word.length > 3 && word.endsWith("s") && !/(ss|us|is)$/.test(word)) return word.slice(0, -1);
    return word;
};

const isVerb = (word) => VERBS.has(word) || VERBS.has(lemma(word)) || (word.endsWith("es") && VERBS.has(word.slice(0, -2)));

/**
 * One of: "noun" (a topic word), "ing" (a gerund: a topic word only as a
 * modifier, "onboarding bug", or after a determiner), "verb" (a topic word
 * only after a determiner, "the fix"), or "skip".
 */
const classify = (token) => {
    if (!/^[a-z][a-z-]*$/.test(token) || token.length < 3 || TOPIC_STOP_WORDS.has(token)) return "skip";
    if (token.endsWith("ly")) return "skip";
    if (token.endsWith("ed") && !token.endsWith("eed")) return "skip";
    if (token.endsWith("ing")) return "ing";
    if (isVerb(token)) return "verb";
    return "noun";
};

const getTopKeywords = (texts, participants = []) => {
    const names = new Set(participants.flatMap((name) => name.toLowerCase().split(/\s+/)));
    const words = new Map(); // lemma -> { count, first, forms }
    const phrases = new Map(); // "lemma lemma" -> { count, first, forms, parts }
    let position = 0;

    const remember = (map, key, form, parts = []) => {
        const entry = map.get(key) ?? { count: 0, first: position, forms: new Map(), parts };
        entry.count += 1;
        entry.forms.set(form, (entry.forms.get(form) ?? 0) + 1);
        map.set(key, entry);
    };

    for (const text of texts) {
        // Words, plus every other character as its own token so punctuation ends a phrase.
        const tokens = text.toLowerCase().replace(/[’]/g, "'").match(/[a-z0-9]+(?:['-][a-z0-9]+)*|[^\sa-z0-9]/g) ?? [];
        const kinds = tokens.map((token) => (names.has(token) ? "skip" : classify(token)));

        // A token is a topic word if it is a noun, or a verb or gerund placed like one.
        const topical = kinds.map((kind, index) => {
            const afterDeterminer = DETERMINERS.has(tokens[index - 1]);
            if (kind === "noun") return true;
            // "the fix", and "onboarding fix" where a gerund modifies it.
            if (kind === "verb") return afterDeterminer || kinds[index - 1] === "ing";
            if (kind === "ing") return afterDeterminer || kinds[index + 1] === "noun" || kinds[index + 1] === "verb";
            return false;
        });

        tokens.forEach((token, index) => {
            position += 1;
            if (!topical[index]) return;
            remember(words, lemma(token), token);
            const next = tokens[index + 1];
            // A repeated word ("release release") is emphasis, not a phrase.
            if (topical[index + 1] && lemma(next) !== lemma(token)) {
                remember(phrases, `${lemma(token)} ${lemma(next)}`, `${token} ${next}`, [lemma(token), lemma(next)]);
            }
        });
    }

    const display = (entry) => [...entry.forms.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const inPhrase = new Set([...phrases.values()].flatMap((entry) => entry.parts));

    const candidates = [
        // A phrase scores for itself and for how often its words recur across the call.
        ...[...phrases.values()].map((entry) => ({
            label: display(entry),
            first: entry.first,
            score: entry.count + entry.parts.reduce((sum, part) => sum + (words.get(part)?.count ?? 0), 0) / 2
        })),
        // A single word is a topic only if it recurs and is not already part of a phrase.
        ...[...words.entries()]
            .filter(([key, entry]) => entry.count >= 2 && !inPhrase.has(key))
            .map(([, entry]) => ({ label: display(entry), first: entry.first, score: entry.count }))
    ];

    return candidates
        .sort((a, b) => b.score - a.score || a.first - b.first)
        .slice(0, MAX_TOPICS)
        .map((entry) => entry.label);
};

// ---------------------------------------------------------------------------
// Statements, action items and the one-sentence summary. Still deterministic:
// sentences are split into clauses, commitment patterns ("owns", "I'll",
// "will", "let's", "Next step:") become action items, and the summary is
// assembled from the agreed outcome and the most discussed topic.
// ---------------------------------------------------------------------------

/** Bumped when the recap's shape changes; older stored recaps are rebuilt on read. */
const SUMMARY_VERSION = 3;
const MAX_KEY_POINTS = 3;
const EVERYONE = "Everyone";

/** Chat labels people type in front of a line. "Agenda" is the plan, not a point. */
const LABEL = /^(agenda|decision|decisions|next steps?|action items?|actions?|todo|to do|update|fyi|note|outcome)\s*:\s*/i;
const OUTCOME_LABELS = new Set(["decision", "decisions", "next step", "next steps", "outcome"]);

const DAY = "today|tonight|tomorrow|eod|end of (?:the )?day|this week|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|lunch|noon";
const DUE = new RegExp(`\\s*\\b(?:(by|on|before|until)\\s+)?(${DAY})\\b`, "i");
const TRAILING_FILLER = /\s+(?:after that|after the call|later|asap|as well|too)$/i;

const SUBJECT_PRONOUNS = new Set(["i", "we", "you", "they", "he", "she", "it"]);

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const stripEnd = (text) => text.replace(/[\s,;:.!?]+$/, "").trim();
const wordCount = (text) => text.split(/\s+/).filter(Boolean).length;

const formatDue = (preposition, when) => {
    const value = when.toLowerCase() === "eod" ? "end of day" : when.toLowerCase();
    return capitalize(preposition?.toLowerCase() === "before" ? `before ${value}` : value);
};

/** "Thursday" -> "on Thursday" (or "by Thursday" when the chat said "by"), "Today" -> "today", "Before lunch" -> "before lunch". */
const dueInSentence = (due, by = false) => {
    const lower = due.toLowerCase();
    if (by && !lower.startsWith("before")) return `by ${/^(today|tonight|tomorrow)$/.test(lower) ? lower : due}`;
    return /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/.test(lower) ? `on ${due}` : lower;
};

/** Takes the due date out of a task: "send the copy by Wednesday" -> ["send the copy", "Wednesday"]. */
const extractDue = (text) => {
    const match = text.match(DUE);
    if (!match) return { text, due: undefined };
    const rest = `${text.slice(0, match.index)}${text.slice(match.index + match[0].length)}`.replace(/\s{2,}/g, " ");
    return { text: rest.trim(), due: formatDue(match[1], match[2]), by: match[1]?.toLowerCase() === "by" };
};

const splitSentences = (text) => text.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean);

/** Clauses inside one sentence: commas, semicolons and "and" before a new subject. */
const splitClauses = (sentence) => sentence
    .split(/\s*[,;]\s*(?:and\s+|then\s+)?|\s+and\s+(?=(?:I|I'll|we|let's|[A-Z][a-z]+\s+(?:owns|will))\b)/)
    .map((part) => stripEnd(part))
    .filter(Boolean);

const toTask = (text) => {
    const cleaned = stripEnd(text).replace(TRAILING_FILLER, "");
    return cleaned ? capitalize(cleaned) : "";
};

/** What someone can own: a thing, not a pronoun ("Gabe takes it" says nothing on its own). */
const OBJECT_PRONOUN = /^(it|this|that|them|those|these|one)$/i;
const LEADING_DETERMINER = /^(?:the|our|a|an|this|that|my|your|their|his|her)\s+/i;

/** "the fix" -> "the onboarding fix" when a topic ends with that word. */
const expandObject = (object, keywords) => {
    const match = object.match(/^(the|our)\s+([a-z-]+)$/i);
    if (!match) return object;
    const topic = keywords.find((keyword) => keyword.split(" ").length > 1 && lemma(keyword.split(" ").pop()) === lemma(match[2].toLowerCase()));
    return topic ? `${match[1].toLowerCase()} ${topic}` : object;
};

/**
 * One clause as an action item, or null.
 * Patterns: "<Name> owns <x>", "<Name|I|we> will|'ll <task>", "let's <task>",
 * and anything after "Next step:" / "Action:" / "TODO:" that starts with "we".
 */
const parseCommitment = (clause, { speaker, label, resolveName, keywords }) => {
    const text = clause.replace(/[’]/g, "'");
    let owner = null;
    let task = null;
    let owned = false;

    const owns = text.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+(?:owns|will own|is owning|takes)\s+(.+)$/);
    const will = text.match(/^([A-Za-z]+(?:\s[A-Z][a-z]+)?)(?:\s+will|'ll|\s+is going to|'m going to|\s+am going to)\s+(.+)$/);
    const lets = text.match(/^let's\s+(.+)$/i);
    const labelled = label && /^(next steps?|action items?|actions?|todo|to do)$/i.test(label) ? text.match(/^we\s+(.+)$/i) : null;
    // "Ship the release Thursday": an imperative with a day is a team commitment.
    const firstWord = (text.split(/\s+/)[0] ?? "").toLowerCase();
    const imperative = VERBS.has(firstWord) && DUE.test(text) && wordCount(text) >= 3;

    if (owns) {
        owner = resolveName(owns[1]);
        // "Aarav owns the fix" is the task "Onboarding fix" with Aarav as owner, never "Own the …".
        const object = expandObject(owns[2], keywords);
        task = owner && !OBJECT_PRONOUN.test(object) ? object.replace(LEADING_DETERMINER, "") : null;
        owned = true;
    } else if (will) {
        const subject = will[1].toLowerCase();
        owner = subject === "i" ? speaker : subject === "we" ? EVERYONE : SUBJECT_PRONOUNS.has(subject) ? null : resolveName(will[1]);
        task = owner ? will[2] : null;
    } else if (lets) {
        owner = EVERYONE;
        task = lets[1];
    } else if (imperative) {
        owner = EVERYONE;
        task = text;
    } else if (labelled) {
        owner = EVERYONE;
        task = labelled[1];
    }

    if (!owner || !task) return null;

    const { text: withoutDue, due, by } = extractDue(task);
    const finalTask = toTask(withoutDue);
    // An owned thing can be one word ("Docs"); any other task needs a verb and an object.
    if (wordCount(finalTask) < (owned ? 1 : 2)) return null;

    // `by` and `owned` only shape the summary sentence; they are not part of the stored item.
    const extra = owned ? { owned } : {};
    return due ? { owner, task: finalTask, due, by, ...extra } : { owner, task: finalTask, ...extra };
};

/** Same owner and the same last word ("the copy"): keep the first, adding a due date it lacked. */
const dedupeActions = (items) => {
    const result = [];
    for (const item of items) {
        const head = lemma(item.task.toLowerCase().split(" ").pop());
        const twin = result.find((other) => other.owner === item.owner && lemma(other.task.toLowerCase().split(" ").pop()) === head);
        if (!twin) {
            result.push(item);
        } else if (!twin.due && item.due) {
            twin.due = item.due;
        }
    }
    return result;
};

const lowerFirst = (sentence, names) => {
    const first = sentence.split(/\s+/)[0] ?? "";
    const keepCase = first === "I" || first.startsWith("I'") || /^[A-Z]{2,}/.test(first) || names.has(first.toLowerCase());
    return keepCase ? sentence : sentence.charAt(0).toLowerCase() + sentence.slice(1);
};

const buildConclusion = ({ chatCount, participantCount, outcome, keyPoints, keywords, names }) => {
    if (!chatCount) {
        return participantCount
            ? `${participantCount} ${participantCount === 1 ? "person" : "people"} joined, but nothing was written in the chat, so there is nothing to summarise.`
            : "Meeting ended without enough activity to write a summary.";
    }

    const topics = keywords.slice(0, 2);
    // The supporting clause: the strongest third-person statement about one of the topics.
    const support = keyPoints.find((point) =>
        keywords.some((topic) => point.text.toLowerCase().includes(topic.toLowerCase()))
        && !/^(I|I'm|I'll|I've|We|We're)\b/.test(point.text)
        && (!outcome || !point.text.toLowerCase().includes(outcome.task.toLowerCase())));

    if (outcome) {
        const when = outcome.due ? ` ${dueInSentence(outcome.due, outcome.by)}` : "";
        // A team outcome reads "Agreed to…"; one person's commitment "Jordan will…"; ownership "Aarav owns the…".
        const first = outcome.owner.split(" ")[0];
        const lead = outcome.owner === EVERYONE
            ? `Agreed to ${lowerFirst(outcome.task, names)}${when}`
            : outcome.owned
                ? `${first} owns the ${lowerFirst(outcome.task, names)}${when}`
                : `${first} will ${lowerFirst(outcome.task, names)}${when}`;
        return support ? `${lead}; ${lowerFirst(stripEnd(support.text), names)}.` : `${lead}.`;
    }

    if (topics.length >= 2) {
        return `Talked through ${topics.map((topic) => `the ${topic}`).join(" and ")}.`;
    }

    return support ? `${capitalize(stripEnd(support.text))}.` : "A short call with a few messages and no clear topic.";
};

const generateMeetingSummary = (meeting) => {
    const activityLogs = meeting.activityLogs || [];
    const chatMessages = activityLogs
        .filter((entry) => entry.type === "chat" && entry.content)
        .map((entry) => ({
            username: entry.username,
            content: normalizeText(entry.content)
        }))
        .filter((entry) => entry.content.length > 0);

    const participantsInvolved = [
        ...new Set(
            activityLogs
                .map((entry) => entry.username)
                .filter(Boolean)
        )
    ];

    const names = new Set(participantsInvolved.flatMap((name) => name.toLowerCase().split(/\s+/)));
    const resolveName = (word) => {
        const lower = word.toLowerCase();
        return participantsInvolved.find((name) => name.toLowerCase() === lower || name.toLowerCase().split(/\s+/)[0] === lower) ?? null;
    };

    const keywords = getTopKeywords(chatMessages.map((entry) => entry.content), participantsInvolved);

    const actions = [];
    const statements = [];
    let outcome = null;
    let order = 0;

    for (const message of chatMessages) {
        for (const rawSentence of splitSentences(message.content)) {
            const labelMatch = rawSentence.match(LABEL);
            const label = labelMatch ? labelMatch[1].toLowerCase() : null;
            const sentence = labelMatch ? rawSentence.slice(labelMatch[0].length) : rawSentence;
            const kept = [];

            for (const clause of splitClauses(sentence)) {
                const action = parseCommitment(clause, { speaker: message.username, label, resolveName, keywords });
                if (action) {
                    actions.push(action);
                    // The agreed outcome: a team commitment, or the first one under "Decision:" / "Next step:".
                    if (!outcome && (action.owner === EVERYONE || (label && OUTCOME_LABELS.has(label) && action.due))) outcome = action;
                } else {
                    kept.push(clause);
                }
            }

            // A sentence with no commitment in it is a statement. The rest of a
            // commitment sentence ("…, and that deadline is firm") leans on it, so it goes too.
            if (label === "agenda" || kept.length !== splitClauses(sentence).length) continue;
            const text = stripEnd(sentence);
            if (wordCount(text) < 4) continue;
            const ending = /[!?]$/.test(sentence) ? sentence.slice(-1) : ".";
            statements.push({ speaker: message.username, text: `${capitalize(text)}${ending}`, order: order++ });
        }
    }

    // Without a team outcome, the first person's commitment carries the summary.
    outcome ??= actions[0] ?? null;

    const keyPoints = statements
        .map((entry) => ({ ...entry, score: scoreSentence(entry.text) }))
        .sort((a, b) => b.score - a.score || a.order - b.order)
        .slice(0, MAX_KEY_POINTS)
        .map(({ speaker, text }) => ({ speaker, text }));

    const actionItems = dedupeActions(actions.map(({ by: _by, owned: _owned, ...item }) => item));

    const highlights = activityLogs
        .filter((entry) => entry.type !== "chat")
        .slice(-3)
        .map((entry) => `${entry.username || "System"} ${entry.content}`.trim());

    const conclusion = buildConclusion({
        chatCount: chatMessages.length,
        participantCount: participantsInvolved.length,
        outcome,
        keyPoints,
        keywords,
        names
    });

    return {
        version: SUMMARY_VERSION,
        generatedAt: new Date(),
        keyPoints,
        actionItems,
        highlights,
        keywords,
        participantsInvolved,
        conclusion
    };
};

export { generateMeetingSummary, SUMMARY_VERSION };

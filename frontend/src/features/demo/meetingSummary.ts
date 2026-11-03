/**
 * Browser copy of backend/src/utils/meetingSummary.js, so the public demo can
 * end in a real recap without an account or a server. The parity test in
 * meetingSummary.test.ts runs both on the same input and must match exactly;
 * change the two together.
 */
import type { MeetingSummaryContent } from "../../lib/types";

export interface ActivityEntry {
    type: "join" | "leave" | "chat" | "ended" | "removed" | "settings-updated";
    username: string;
    content: string;
}

const STOP_WORDS = new Set([
    "the", "and", "for", "that", "this", "with", "have", "from", "were", "your", "into", "about", "there",
    "their", "will", "would", "could", "should", "what", "when", "where", "which", "while", "been", "being",
    "them", "they", "then", "than", "just", "some", "very", "more", "most", "also", "only", "over", "under",
    "after", "before", "because", "through", "during", "each", "such", "our", "out", "are", "was", "but",
    "not", "you", "all", "can", "has", "had", "let", "lets", "its", "it's", "a", "an", "to", "of", "in", "on", "is", "it",
    "sounds", "sound", "good", "great", "nice", "okay", "yeah", "yes", "sure", "thanks", "thank", "think", "know",
    "like", "really", "maybe", "right", "well", "going", "gonna", "want", "make", "here", "everyone", "today",
    "i'll", "we'll", "i'm", "we're", "that's", "don't", "can't", "does", "doing", "done", "said", "says", "okay"
]);

const normalizeText = (value = "") => value.replace(/\s+/g, " ").trim();

const scoreSentence = (sentence: string) => {
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

interface TopicEntry {
    count: number;
    first: number;
    forms: Map<string, number>;
    parts: string[];
}

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
    "true", "false", "real", "actually", "basically", "probably", "definitely", "totally", "pretty", "enough"
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
const lemma = (word: string) => {
    if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
    if (word.length > 3 && word.endsWith("s") && !/(ss|us|is)$/.test(word)) return word.slice(0, -1);
    return word;
};

const isVerb = (word: string) => VERBS.has(word) || VERBS.has(lemma(word)) || (word.endsWith("es") && VERBS.has(word.slice(0, -2)));

/**
 * One of: "noun" (a topic word), "ing" (a gerund: a topic word only as a
 * modifier, "onboarding bug", or after a determiner), "verb" (a topic word
 * only after a determiner, "the fix"), or "skip".
 */
const classify = (token: string): "noun" | "ing" | "verb" | "skip" => {
    if (!/^[a-z][a-z-]*$/.test(token) || token.length < 3 || TOPIC_STOP_WORDS.has(token)) return "skip";
    if (token.endsWith("ly")) return "skip";
    if (token.endsWith("ed") && !token.endsWith("eed")) return "skip";
    if (token.endsWith("ing")) return "ing";
    if (isVerb(token)) return "verb";
    return "noun";
};

const getTopKeywords = (texts: string[], participants: string[] = []) => {
    const names = new Set(participants.flatMap((name) => name.toLowerCase().split(/\s+/)));
    const words = new Map<string, TopicEntry>(); // lemma -> counts
    const phrases = new Map<string, TopicEntry>(); // "lemma lemma" -> counts
    let position = 0;

    const remember = (map: Map<string, TopicEntry>, key: string, form: string, parts: string[] = []) => {
        const entry = map.get(key) ?? { count: 0, first: position, forms: new Map<string, number>(), parts };
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
            const afterDeterminer = DETERMINERS.has(tokens[index - 1] ?? "");
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
            if (next !== undefined && topical[index + 1] && lemma(next) !== lemma(token)) {
                remember(phrases, `${lemma(token)} ${lemma(next)}`, `${token} ${next}`, [lemma(token), lemma(next)]);
            }
        });
    }

    const display = (entry: TopicEntry) => [...entry.forms.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
    const inPhrase = new Set([...phrases.values()].flatMap((entry) => entry.parts));

    const candidates = [
        // A phrase scores for itself and for how often its words recur across the call.
        ...[...phrases.values()].map((entry) => ({
            label: display(entry),
            first: entry.first,
            score: entry.count + (entry.parts.reduce((sum, part) => sum + (words.get(part)?.count ?? 0), 0)) / 2
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

const buildConclusion = (chatCount: number, keywords: string[], participants: string[]) => {
    if (!chatCount) {
        return participants.length
            ? `Meeting ended with ${participants.length} participant${participants.length > 1 ? "s" : ""}, but there were no chat highlights to summarize.`
            : "Meeting ended without enough activity to generate a detailed conclusion.";
    }
    if (!keywords.length) {
        return `Discussion involved ${participants.join(", ") || "the meeting participants"} and covered several topics without one dominant theme.`;
    }
    return `The meeting focused mainly on ${keywords.slice(0, 3).join(", ")} and involved ${participants.join(", ") || "the meeting participants"}.`;
};

export function generateMeetingSummary(activityLogs: ActivityEntry[], now = new Date()): MeetingSummaryContent {
    const chatMessages = activityLogs
        .filter((entry) => entry.type === "chat" && entry.content)
        .map((entry) => ({ username: entry.username, content: normalizeText(entry.content) }))
        .filter((entry) => entry.content.length > 0);

    const participantsInvolved = [...new Set(activityLogs.map((entry) => entry.username).filter(Boolean))];

    const keyPoints = chatMessages
        .map((entry) => `${entry.username}: ${entry.content}`)
        .map((sentence) => ({ sentence, score: scoreSentence(sentence) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((entry) => entry.sentence);

    const highlights = activityLogs
        .filter((entry) => entry.type !== "chat")
        .slice(-3)
        .map((entry) => `${entry.username || "System"} ${entry.content}`.trim());

    const keywords = getTopKeywords(chatMessages.map((entry) => entry.content), participantsInvolved);

    return {
        generatedAt: now.toISOString(),
        keyPoints,
        highlights,
        keywords,
        participantsInvolved,
        conclusion: buildConclusion(chatMessages.length, keywords, participantsInvolved)
    };
}

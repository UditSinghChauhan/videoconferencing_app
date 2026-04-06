const STOP_WORDS = new Set([
    "the", "and", "for", "that", "this", "with", "have", "from", "were", "your", "into", "about", "there",
    "their", "will", "would", "could", "should", "what", "when", "where", "which", "while", "been", "being",
    "them", "they", "then", "than", "just", "some", "very", "more", "most", "also", "only", "over", "under",
    "after", "before", "because", "through", "during", "each", "such", "our", "out", "are", "was", "but",
    "not", "you", "all", "can", "has", "had", "let", "lets", "its", "it's", "a", "an", "to", "of", "in", "on", "is", "it"
]);

const normalizeText = (value = "") => value.replace(/\s+/g, " ").trim();

const scoreSentence = (sentence) => {
    let score = 0;

    if (sentence.length >= 40) score += 2;
    if (/[.!?]$/.test(sentence)) score += 1;
    if (/\b(decide|action|next|follow up|deadline|ship|issue|plan|summary|important|need|should|must|todo)\b/i.test(sentence)) score += 3;

    return score;
};

const getTopKeywords = (texts) => {
    const counts = new Map();

    texts
        .join(" ")
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 3 && !STOP_WORDS.has(word))
        .forEach((word) => {
            counts.set(word, (counts.get(word) || 0) + 1);
        });

    return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([word]) => word);
};

const buildConclusion = ({ chatMessages, keywords, participants }) => {
    if (!chatMessages.length) {
        return participants.length
            ? `Meeting ended with ${participants.length} participant${participants.length > 1 ? "s" : ""}, but there were no chat highlights to summarize.`
            : "Meeting ended without enough activity to generate a detailed conclusion.";
    }

    if (!keywords.length) {
        return `Discussion involved ${participants.join(", ") || "the meeting participants"} and covered several topics without one dominant theme.`;
    }

    return `The meeting focused mainly on ${keywords.slice(0, 3).join(", ")} and involved ${participants.join(", ") || "the meeting participants"}.`;
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

    const candidateSentences = chatMessages
        .map((entry) => `${entry.username}: ${entry.content}`)
        .filter((sentence) => sentence.length > 0);

    const keyPoints = candidateSentences
        .map((sentence) => ({ sentence, score: scoreSentence(sentence) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((entry) => entry.sentence);

    const highlights = activityLogs
        .filter((entry) => entry.type !== "chat")
        .slice(-3)
        .map((entry) => `${entry.username || "System"} ${entry.content}`.trim());

    const keywords = getTopKeywords(chatMessages.map((entry) => entry.content));
    const conclusion = buildConclusion({
        chatMessages,
        keywords,
        participants: participantsInvolved
    });

    return {
        generatedAt: new Date(),
        keyPoints,
        highlights,
        keywords,
        participantsInvolved,
        conclusion
    };
};

export { generateMeetingSummary };

const MEETING_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/;

/**
 * Accepts what people actually paste into a "join" box: a bare code, a code
 * with stray spaces, or a full invite link, and returns the meeting code.
 * Returns null when the input cannot be a valid code.
 */
export const parseMeetingInput = (input: string): string | null => {
    const trimmed = input.trim();

    if (!trimmed) {
        return null;
    }

    const fromLink = trimmed.match(/\/room\/([^/?#\s]+)/);
    const candidate = (fromLink?.[1] ?? trimmed).replace(/\s+/g, "");

    let decoded = candidate;
    try {
        decoded = decodeURIComponent(candidate);
    } catch {
        return null;
    }

    return MEETING_ID_PATTERN.test(decoded) ? decoded : null;
};

export const inviteLinkFor = (meetingId: string, origin: string = window.location.origin): string =>
    `${origin}/room/${encodeURIComponent(meetingId)}`;

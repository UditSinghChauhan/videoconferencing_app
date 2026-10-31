import crypto from "node:crypto";

// Consonant-heavy alphabet without look-alike letters, so codes are easy to
// read aloud and type ("kmt-vrqp-xhw"). 23^10 ≈ 4e13 combinations.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz";
const GROUPS = [3, 4, 3];

const MEETING_CODE_PATTERN = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/;

// Codes users type themselves (legacy rooms, "design-review"): letters,
// digits, hyphen and underscore only, so they are always safe in a URL path.
const MEETING_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/;

const randomGroup = (length) => Array.from(
    { length },
    () => ALPHABET[crypto.randomInt(ALPHABET.length)]
).join("");

const generateMeetingCode = () => GROUPS.map(randomGroup).join("-");

export { generateMeetingCode, MEETING_CODE_PATTERN, MEETING_ID_PATTERN };

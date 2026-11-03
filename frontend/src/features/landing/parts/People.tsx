import { avatarColorFor, initialsFor } from "../../../lib/format";
import { Avatar } from "../cast/Avatar";
import { CAST, CAST_ORDER, castByName, type CastId } from "../cast/people";
import styles from "./People.module.css";

/** Below this size an illustrated face is a few cropped pixels; a monogram on the person's hue reads better. */
const MONOGRAM_BELOW = 28;

/** A cast member as a circle: their head and shoulders at 28 px and up, their initials on their hue below that. */
export function Face({ person, size = 24, initialsSize }: { person: CastId; size?: number; initialsSize?: number }) {
    const { name, hue } = CAST[person];
    if (size < MONOGRAM_BELOW) {
        return (
            <span
                className={`${styles.face} ${styles.monogram}`}
                style={{ width: size, height: size, background: hue ?? avatarColorFor(name), fontSize: initialsSize ?? Math.max(9, Math.round(size * 0.42)) }}
                aria-hidden="true"
            >
                {initialsFor(name)}
            </span>
        );
    }
    return (
        <span className={styles.face} style={{ width: size, height: size }} aria-hidden="true">
            <Avatar person={person} crop="face" still withoutRoom />
        </span>
    );
}

/** The whole team, for an owner of "Everyone": the avatar stack stands in for the word. */
export function TeamStack({ size = STACK_MIN }: { size?: number }) {
    return <FaceStack people={CAST_ORDER} size={size} label="Everyone" />;
}

/** An owner or speaker: face plus first name. A team commitment shows the team stack and no name. */
export function OwnerChip({ name, short = true }: { name: string; short?: boolean }) {
    if (name === "Everyone") return <TeamStack />;
    const member = castByName(name);
    return (
        <span className={styles.chip}>
            {member ? <Face person={member.id} size={20} /> : null}
            <span>{member && short ? member.name.split(" ")[0] : name}</span>
        </span>
    );
}

/** Stacks never go below this (the brief asks for 22 at least), so the initials in each circle stay readable. */
const STACK_MIN = 24;
/** Two people, then a "+N" chip for the rest: past two, overlapping initials stop being legible. */
const STACK_SHOWN = 2;

/** Overlapping faces, for "who was there": at most two, then "+N". */
export function FaceStack({ people, size = 24, label }: { people: CastId[]; size?: number; label?: string }) {
    const px = Math.max(STACK_MIN, size);
    const shown = people.slice(0, STACK_SHOWN);
    const rest = people.length - shown.length;
    const text = Math.max(10, Math.round(px * 0.42));
    return (
        <span className={styles.stack} aria-label={label ?? people.map((id) => CAST[id].name).join(", ")} role="img">
            {shown.map((id) => <Face key={id} person={id} size={px} initialsSize={text} />)}
            {rest > 0 ? (
                <span className={`${styles.face} ${styles.more}`} style={{ width: px, height: px, fontSize: text }} aria-hidden="true">
                    +{rest}
                </span>
            ) : null}
        </span>
    );
}

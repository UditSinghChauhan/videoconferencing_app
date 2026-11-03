import { Users } from "lucide-react";
import { Avatar } from "../cast/Avatar";
import { CAST, castByName, type CastId } from "../cast/people";
import styles from "./People.module.css";

/** A cast member's head and shoulders in a circle, still (chips should not blink at you). */
export function Face({ person, size = 24 }: { person: CastId; size?: number }) {
    return (
        <span className={styles.face} style={{ width: size, height: size }} aria-hidden="true">
            <Avatar person={person} crop="face" still />
        </span>
    );
}

/** An owner or speaker: face plus first name. "Everyone" gets a group mark. */
export function OwnerChip({ name, short = true }: { name: string; short?: boolean }) {
    const member = castByName(name);
    return (
        <span className={styles.chip}>
            {member ? <Face person={member.id} size={20} /> : <span className={styles.group} aria-hidden="true"><Users size={11} /></span>}
            <span>{member && short ? member.name.split(" ")[0] : name}</span>
        </span>
    );
}

/** Overlapping faces, for "who was there". */
export function FaceStack({ people, size = 24 }: { people: CastId[]; size?: number }) {
    return (
        <span className={styles.stack} aria-label={people.map((id) => CAST[id].name).join(", ")} role="img">
            {people.map((id) => <Face key={id} person={id} size={size} />)}
        </span>
    );
}

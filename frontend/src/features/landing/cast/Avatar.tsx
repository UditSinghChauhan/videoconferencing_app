import { memo, useEffect, useId, useRef, type CSSProperties, type ReactNode } from "react";
import { CAST, type CastId, type CastMember } from "./people";
import { RoomBackdrop } from "./RoomBackdrop";
import styles from "./Cast.module.css";

interface AvatarProps {
    person: CastId;
    /** Mouth and hand move only while this person is the active speaker. */
    speaking?: boolean;
    /** A neutral, motionless pose: reduced motion, posters and print. */
    still?: boolean;
    /** Leave out the room (for small chips); the person sits on the room's wall colour. */
    withoutRoom?: boolean;
    className?: string;
    /** Accessible name; without it the drawing is decorative (the tile around it names the person). */
    label?: string;
}

/**
 * One member of the illustrated demo cast, in their room, framed like a
 * 16:9 webcam feed. Layered SVG, so it stays crisp at any size. Idle life
 * (breathing, a jittered blink, small head tilts) runs in CSS; the blink
 * timer is the only script and touches a data attribute, never React state.
 */
export const Avatar = memo(function Avatar({ person, speaking = false, still = false, withoutRoom = false, className, label }: AvatarProps) {
    const member = CAST[person];
    const id = useId().replace(/:/g, "");
    const root = useRef<SVGSVGElement>(null);

    useBlink(root, still);

    return (
        <svg
            ref={root}
            viewBox="0 0 640 360"
            preserveAspectRatio="xMidYMid slice"
            className={[styles.feed, className].filter(Boolean).join(" ")}
            data-speaking={speaking && !still ? "" : undefined}
            data-still={still ? "" : undefined}
            style={{ "--phase": `${-member.phase}s` } as CSSProperties}
            role={label ? "img" : undefined}
            aria-label={label}
            aria-hidden={label ? undefined : true}
            focusable="false"
        >
            {withoutRoom ? null : <RoomBackdrop kind={member.room} id={id} />}
            <g transform={`translate(${member.seat.x} ${member.seat.y}) scale(${member.seat.scale})`}>
                <g className={styles.breathe}>
                    <Person member={member} id={id} />
                </g>
                <Hand member={member} />
            </g>
        </svg>
    );
});

/** Blink every 3–6 s with random jitter, by toggling `data-blink` for 130 ms. */
function useBlink(root: React.RefObject<SVGSVGElement>, still: boolean) {
    useEffect(() => {
        if (still) return;
        let timer = 0;
        const schedule = () => {
            timer = window.setTimeout(() => {
                root.current?.setAttribute("data-blink", "");
                timer = window.setTimeout(() => {
                    root.current?.removeAttribute("data-blink");
                    schedule();
                }, 130);
            }, 3000 + Math.random() * 3000);
        };
        schedule();
        return () => window.clearTimeout(timer);
    }, [root, still]);
}

const HEAD = "M0 -64C30 -64 48 -44 48 -8C48 22 35 46 15 55C8 58 -8 58 -15 55C-35 46 -48 22 -48 -8C-48 -44 -30 -64 0 -64Z";
const TORSO = "M-172 230C-172 154 -138 120 -76 108C-52 103 -31 97 -23 86L23 86C31 97 52 103 76 108C138 120 172 154 172 230Z";

function Person({ member, id }: { member: CastMember; id: string }) {
    const { skin, brow } = member;
    // Light falls from the room's window or lamp; Jordan's room is lit from the right.
    const lightFromRight = member.id === "jordan";
    const faceShade = lightFromRight
        ? "M-16 -66C-50 -50 -58 0 -42 40C-32 56 -14 62 0 62L0 66L-62 66L-62 -66Z"
        : "M16 -66C50 -50 58 0 42 40C32 56 14 62 0 62L0 66L62 66L62 -66Z";

    return (
        <>
            <g className={styles.tilt}>{hairBack(member)}</g>
            <path d={TORSO} fill={member.clothes.outer} />
            <path d={lightFromRight ? "M-172 230C-172 154 -138 120 -76 108L-60 230Z" : "M172 230C172 154 138 120 76 108L60 230Z"} fill={member.clothes.outerShade} opacity="0.5" />
            {clothes(member)}
            {/* Neck, with the jaw's shadow */}
            <path d="M-19 30L-19 96C-10 104 10 104 19 96L19 30Z" fill={skin.base} />
            <path d="M-19 40C-8 58 8 58 19 40L19 66C8 72 -8 72 -19 66Z" fill={skin.shade} opacity="0.6" />
            {neckwear(member)}
            <g className={styles.tilt}>
                <g className={styles.nod}>
                <g transform={`scale(${member.head.x} ${member.head.y})`}>
                    {/* Ears */}
                    {[-1, 1].map((side) => (
                        <g key={side}>
                            <ellipse cx={side * 46} cy="4" rx="9" ry="14" fill={skin.base} />
                            <ellipse cx={side * 47} cy="5" rx="4" ry="8" fill={skin.shade} opacity="0.7" />
                        </g>
                    ))}
                    <clipPath id={`${id}-face`}><path d={HEAD} /></clipPath>
                    <path d={HEAD} fill={skin.base} />
                    <g clipPath={`url(#${id}-face)`}>
                        <path d={faceShade} fill={skin.shade} opacity="0.42" />
                        <ellipse cx={lightFromRight ? 18 : -18} cy="-34" rx="16" ry="10" fill={skin.light} opacity="0.5" />
                    </g>
                    {/* Cheeks */}
                    <ellipse cx="-25" cy="18" rx="10" ry="6" fill={skin.blush} opacity="0.22" />
                    <ellipse cx="25" cy="18" rx="10" ry="6" fill={skin.blush} opacity="0.22" />
                    {/* Eyes */}
                    {[-1, 1].map((side) => (
                        <g key={side} className={styles.eye}>
                            <ellipse cx={side * 17} cy="-3" rx="4.8" ry="5.8" fill="#1d1716" />
                            <circle cx={side * 17 + 1.6} cy="-5.2" r="1.5" fill="#fff" opacity="0.85" />
                        </g>
                    ))}
                    {/* Brows */}
                    <path d="M-29 -19Q-19 -26 -8 -21" fill="none" stroke={brow} strokeWidth="4.2" strokeLinecap="round" />
                    <path d="M29 -19Q19 -26 8 -21" fill="none" stroke={brow} strokeWidth="4.2" strokeLinecap="round" />
                    {/* Nose */}
                    <path d="M-1 3C-4 12 -6 17 -1 19.5C2 20.5 5 19.6 7 18" fill="none" stroke={skin.shade} strokeWidth="3" strokeLinecap="round" />
                    {member.id === "sofia" ? <SmileLines color={skin.shade} /> : null}
                    {member.id === "aarav" ? <Beard member={member} /> : null}
                    {/* Mouth: a resting smile, and the open mouth that talks */}
                    <path className={styles.mouthClosed} d="M-11 33Q0 40 11 33" fill="none" stroke={skin.lip} strokeWidth="3.4" strokeLinecap="round" />
                    <g className={styles.mouthOpen}>
                        <path d="M-11 31Q0 29 11 31Q10 44 0 45Q-10 44 -11 31Z" fill="#3b1d1a" />
                        <rect x="-7.5" y="30.6" width="15" height="3.4" rx="1.6" fill="#f3ece4" />
                        <ellipse cx="0" cy="41" rx="5.5" ry="2.6" fill="#b4564a" />
                    </g>
                    {hairFront(member)}
                    {member.id === "aarav" ? <Glasses /> : null}
                    {earrings(member)}
                </g>
                </g>
            </g>
        </>
    );
}

function hairBack({ id, hair }: CastMember): ReactNode {
    if (id === "maya") {
        return (
            <>
                <path d="M0 -76C47 -76 66 -42 63 -4C61 30 72 62 82 98C64 112 36 106 26 78L-26 78C-36 106 -64 112 -82 98C-72 62 -61 30 -63 -4C-66 -42 -47 -76 0 -76Z" fill={hair.base} />
                <path d="M54 10C56 40 64 66 74 92" fill="none" stroke={hair.shade} strokeWidth="5" strokeLinecap="round" />
                <path d="M-54 10C-56 40 -64 66 -74 92" fill="none" stroke={hair.shade} strokeWidth="5" strokeLinecap="round" />
            </>
        );
    }
    if (id === "sofia") {
        return <path d="M0 -74C47 -74 63 -40 61 0C60 26 63 44 59 57C47 63 37 55 35 43L-35 43C-37 55 -47 63 -59 57C-63 44 -60 26 -61 0C-63 -40 -47 -74 0 -74Z" fill={hair.base} />;
    }
    return null;
}

function hairFront({ id, hair }: CastMember): ReactNode {
    switch (id) {
        case "maya":
            return (
                <>
                    <path d="M-51 4C-55 -46 -31 -73 0 -73C31 -73 55 -46 51 4C47 -24 31 -41 6 -46L0 -38L-6 -46C-31 -41 -47 -24 -51 4Z" fill={hair.base} />
                    <path d="M-6 -60C-22 -58 -36 -48 -42 -30" fill="none" stroke={hair.shade} strokeWidth="3" strokeLinecap="round" opacity="0.8" />
                </>
            );
        case "aarav":
            return (
                <>
                    <path d="M-49 -4C-55 -50 -27 -78 6 -76C37 -74 56 -51 49 -6C46 -26 40 -36 30 -41C14 -51 -10 -49 -26 -42C-37 -35 -45 -22 -49 -4Z" fill={hair.base} />
                    <path d="M-14 -66C6 -72 28 -66 38 -52" fill="none" stroke="#3a302c" strokeWidth="3" strokeLinecap="round" />
                </>
            );
        case "sofia":
            return (
                <>
                    <path d="M-53 2C-57 -48 -28 -76 0 -76C28 -76 57 -48 53 2C51 -14 47 -21 43 -23C22 -18 -22 -18 -43 -23C-47 -21 -51 -14 -53 2Z" fill={hair.base} />
                    <path d="M-30 -56C-14 -64 14 -64 30 -56" fill="none" stroke="#e6e1da" strokeWidth="4" strokeLinecap="round" />
                    <path d="M-43 -23C-22 -18 22 -18 43 -23" fill="none" stroke={hair.shade} strokeWidth="2.5" strokeLinecap="round" />
                </>
            );
        case "jordan":
            return (
                <>
                    <path d="M-49 -6C-55 -50 -29 -78 2 -76C33 -76 55 -53 49 -6C47 -24 41 -32 35 -34L29 -25L21 -37L9 -27L-2 -39L-14 -28L-25 -37L-35 -26C-41 -28 -47 -20 -49 -6Z" fill={hair.base} />
                    <path d="M-20 -64C-4 -70 18 -68 32 -58" fill="none" stroke="#3b3536" strokeWidth="3" strokeLinecap="round" />
                </>
            );
    }
}

function clothes({ id, clothes: c }: CastMember): ReactNode {
    switch (id) {
        case "maya":
            // Cardigan over a cream tee.
            return (
                <>
                    <path d="M-25 90L25 90L42 110L12 230L-12 230L-42 110Z" fill={c.inner} />
                    <path d="M-21 91C-13 104 13 104 21 91" fill="none" stroke="#d9cbb5" strokeWidth="3" />
                    <path d="M-42 110L-12 230M42 110L12 230" stroke={c.outerShade} strokeWidth="4" />
                </>
            );
        case "aarav":
            // Overshirt with a collar over a crew-neck tee.
            return (
                <>
                    <path d="M-27 90C-18 110 18 110 27 90L34 100L0 140L-34 100Z" fill={c.inner} />
                    <path d="M-27 88L-54 104L-34 132L-12 104Z" fill={c.outerShade} />
                    <path d="M27 88L54 104L34 132L12 104Z" fill={c.outerShade} />
                    <path d="M0 140V230" stroke={c.outerShade} strokeWidth="3" />
                    <circle cx="6" cy="168" r="2.5" fill={c.outerShade} />
                    <circle cx="6" cy="200" r="2.5" fill={c.outerShade} />
                </>
            );
        case "sofia":
            // Crew-neck sweater with a shirt collar and a small pendant.
            return (
                <>
                    <path d="M-29 90C-20 112 20 112 29 90Z" fill={c.inner} />
                    <path d="M-22 92L-3 113L-17 120L-32 98Z" fill={c.inner} />
                    <path d="M22 92L3 113L17 120L32 98Z" fill={c.inner} />
                    <path d="M-29 90C-20 112 20 112 29 90" fill="none" stroke={c.outerShade} strokeWidth="4" />
                    <path d="M-14 100C-8 118 8 118 14 100" fill="none" stroke="#c9a46a" strokeWidth="1.5" />
                    <circle cx="0" cy="118" r="4" fill="#d6b06e" />
                </>
            );
        case "jordan":
            // Hoodie with the hood behind the neck and drawstrings.
            return (
                <>
                    <path d="M-64 114C-72 82 -50 70 -28 80L28 80C50 70 72 82 64 114C42 100 -42 100 -64 114Z" fill={c.outerShade} />
                    <path d="M-14 104L-17 156M14 104L17 156" stroke={c.inner} strokeWidth="3.5" strokeLinecap="round" />
                    <path d="M-60 200C-30 214 30 214 60 200" fill="none" stroke={c.outerShade} strokeWidth="3" />
                </>
            );
    }
}

function neckwear({ id }: CastMember): ReactNode {
    if (id !== "jordan") return null;
    // Headphones resting around the neck.
    return (
        <>
            <path d="M-52 92C-46 122 46 122 52 92" fill="none" stroke="#2a2b30" strokeWidth="9" strokeLinecap="round" />
            <ellipse cx="-55" cy="96" rx="15" ry="19" fill="#33353b" />
            <ellipse cx="55" cy="96" rx="15" ry="19" fill="#33353b" />
            <ellipse cx="-55" cy="96" rx="7" ry="10" fill="#4a4d55" />
            <ellipse cx="55" cy="96" rx="7" ry="10" fill="#4a4d55" />
        </>
    );
}

function earrings({ id }: CastMember): ReactNode {
    if (id === "maya") {
        return [-1, 1].map((side) => <circle key={side} cx={side * 47} cy="20" r="5" fill="none" stroke="#d6a54a" strokeWidth="2.2" />);
    }
    if (id === "sofia") {
        return [-1, 1].map((side) => <circle key={side} cx={side * 47} cy="18" r="3.4" fill="#f4efe6" />);
    }
    return null;
}

function SmileLines({ color }: { color: string }) {
    return (
        <>
            <path d="M-34 -2Q-37 3 -34 8" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
            <path d="M34 -2Q37 3 34 8" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
            <path d="M-17 27Q-20 32 -17 37" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
            <path d="M17 27Q20 32 17 37" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
        </>
    );
}

function Beard({ member }: { member: CastMember }) {
    return (
        <>
            <path d="M-45 4C-43 32 -26 58 0 61C26 58 43 32 45 4C40 22 30 32 18 38C10 44 -10 44 -18 38C-30 32 -40 22 -45 4Z" fill={member.hair.base} opacity="0.92" />
            <path d="M-15 27C-6 22 6 22 15 27C9 26.5 -9 26.5 -15 27Z" fill={member.hair.base} stroke={member.hair.base} strokeWidth="4" strokeLinejoin="round" />
        </>
    );
}

function Glasses() {
    return (
        <g fill="none" stroke="#2a2320" strokeWidth="3">
            <circle cx="-18" cy="-3" r="14" />
            <circle cx="18" cy="-3" r="14" />
            <path d="M-4 -4Q0 -7 4 -4M-32 -6L-46 -9M32 -6L46 -9" strokeLinecap="round" />
            <circle cx="-18" cy="-3" r="14" fill="#ffffff" opacity="0.06" stroke="none" />
        </g>
    );
}

/** A hand that rises into frame and gestures while this person speaks. */
function Hand({ member }: { member: CastMember }) {
    const { skin, clothes: c } = member;
    const side = member.id === "jordan" || member.id === "sofia" ? -1 : 1;
    return (
        <g transform={`translate(${side * 128} 132) scale(${side} 1)`}>
            <g className={styles.hand}>
                <path d="M-27 96L-21 6L22 6L29 96Z" fill={c.outer} />
                <rect x="-22" y="0" width="44" height="11" rx="3" fill={c.outerShade} />
                <path d="M-18 3C-20 -15 -20 -29 -16 -39L16 -39C20 -29 20 -15 18 3Z" fill={skin.base} />
                {[[-16, 25], [-8, 31], [0, 29], [8, 23]].map(([x, h]) => (
                    <rect key={x} x={x} y={-37 - (h ?? 0)} width="8.4" height={(h ?? 0) + 6} rx="4.2" fill={skin.base} />
                ))}
                <path d="M-16 -12C-29 -19 -35 -30 -31 -36C-27 -41 -20 -35 -16 -28Z" fill={skin.base} />
                <path d="M-8 -38V-30M0 -38V-30M8 -38V-31" stroke={skin.shade} strokeWidth="1.6" strokeLinecap="round" />
                <path d="M10 -36C14 -24 15 -10 13 2" fill="none" stroke={skin.shade} strokeWidth="5" opacity="0.4" />
            </g>
        </g>
    );
}

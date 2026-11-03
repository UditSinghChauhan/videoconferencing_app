import type { RoomKind } from "./people";

/**
 * The room behind each person, drawn in the 640 × 360 frame of a webcam feed.
 * Simple, specific props (a shelf, a lamp, a window, a print) so a tile reads
 * as someone's own space at a glance. Flat shapes, one soft light per room.
 */
export function RoomBackdrop({ kind, id }: { kind: RoomKind; id: string }) {
    switch (kind) {
        case "shelf":
            return <Shelf id={id} />;
        case "lamp":
            return <Lamp id={id} />;
        case "window":
            return <Window id={id} />;
        case "print":
            return <Print id={id} />;
    }
}

/** Maya: warm plaster, a bookshelf on the right, a plant on the left, daylight from the left. */
function Shelf({ id }: { id: string }) {
    const books: [number, number, number, string][] = [
        // x, width, height, colour (shelf 1 then 2)
        [478, 14, 62, "#8a5a44"], [494, 10, 54, "#d9b48a"], [506, 16, 66, "#4f6d5a"], [524, 12, 50, "#e8d6bd"],
        [538, 18, 60, "#2f3a36"], [568, 12, 56, "#b4440a"], [582, 14, 48, "#c9a27a"],
        [478, 16, 58, "#566c8f"], [496, 12, 64, "#e2cfb2"], [510, 10, 52, "#8c6d2f"], [524, 18, 62, "#3b2f2c"]
    ];
    return (
        <g>
            <rect width="640" height="360" fill="#e7dac7" />
            <radialGradient id={`${id}-sun`} cx="0.12" cy="0.2" r="0.7">
                <stop offset="0" stopColor="#f6ecdd" />
                <stop offset="1" stopColor="#f6ecdd" stopOpacity="0" />
            </radialGradient>
            <rect width="640" height="360" fill={`url(#${id}-sun)`} />
            {/* Shelf */}
            <rect x="466" y="0" width="150" height="360" fill="#d4c2a9" />
            <rect x="466" y="0" width="6" height="360" fill="#c4b094" />
            {[72, 166, 260].map((y) => <rect key={y} x="466" y={y} width="150" height="8" fill="#b89f80" />)}
            {books.map(([x, w, h, fill], index) => {
                const base = index < 7 ? 166 : 260;
                return <rect key={index} x={x} y={base - h} width={w} height={h} rx="1.5" fill={fill} />;
            })}
            <rect x="552" y="114" width="12" height="52" rx="1.5" fill="#efe4d3" transform="rotate(-12 558 166)" />
            <circle cx="500" cy="56" r="14" fill="#c9a27a" />
            <rect x="488" y="56" width="24" height="16" rx="3" fill="#a9825e" />
            {/* Plant */}
            <g transform="translate(78 236)">
                {([[-34, -60, -28], [-8, -84, -6], [22, -66, 22], [38, -38, 48], [-46, -30, -58], [8, -48, 8]] as const).map(([x, y, r], index) => (
                    <ellipse key={index} cx={x} cy={y} rx="14" ry="40" fill={index % 2 ? "#4c6a4a" : "#5f7d5c"} transform={`rotate(${r} ${x} ${y + 30})`} />
                ))}
                <path d="M-30 0h60l-8 52h-44z" fill="#b8805c" />
                <rect x="-34" y="-6" width="68" height="10" rx="3" fill="#c99470" />
            </g>
        </g>
    );
}

/** Aarav: an evening room, deep green wall, a warm desk lamp at the left. */
function Lamp({ id }: { id: string }) {
    return (
        <g>
            <rect width="640" height="360" fill="#2e3a37" />
            <radialGradient id={`${id}-glow`} cx="0.17" cy="0.42" r="0.55">
                <stop offset="0" stopColor="#f2c27b" stopOpacity="0.55" />
                <stop offset="0.45" stopColor="#c99a5c" stopOpacity="0.16" />
                <stop offset="1" stopColor="#c99a5c" stopOpacity="0" />
            </radialGradient>
            <rect width="640" height="360" fill={`url(#${id}-glow)`} />
            {/* Framed print */}
            <rect x="476" y="54" width="104" height="128" rx="2" fill="#1f2826" />
            <rect x="486" y="64" width="84" height="108" fill="#d8cbb5" />
            <path d="M486 150l26-34 20 22 14-14 24 26v22h-84z" fill="#8c6d2f" />
            <circle cx="548" cy="92" r="9" fill="#e8590c" opacity="0.8" />
            {/* Lamp */}
            <g transform="translate(106 128)">
                <rect x="-3" y="34" width="6" height="200" fill="#1c2321" />
                <path d="M-46 36h92l-20-70h-52z" fill="#f0c27a" />
                <path d="M-46 36h92l-6-12h-80z" fill="#d9a560" />
                <ellipse cx="0" cy="40" rx="30" ry="6" fill="#ffe2a8" opacity="0.9" />
            </g>
            {/* Shelf edge */}
            <rect x="0" y="300" width="640" height="60" fill="#25302d" />
        </g>
    );
}

/** Sofia: a bright room, a window on the left, a framed sketch on the right. */
function Window({ id }: { id: string }) {
    return (
        <g>
            <rect width="640" height="360" fill="#ece3d6" />
            <radialGradient id={`${id}-day`} cx="0.25" cy="0.35" r="0.6">
                <stop offset="0" stopColor="#fbf6ee" />
                <stop offset="1" stopColor="#fbf6ee" stopOpacity="0" />
            </radialGradient>
            <rect width="640" height="360" fill={`url(#${id}-day)`} />
            {/* Window */}
            <rect x="44" y="30" width="196" height="232" rx="3" fill="#f7f3ec" />
            <rect x="56" y="42" width="172" height="208" fill="#cfdedb" />
            <path d="M56 250V170c30-12 60-6 90 6s58 10 82-2v76z" fill="#b6ccc2" />
            <rect x="139" y="42" width="6" height="208" fill="#f7f3ec" />
            <rect x="56" y="143" width="172" height="6" fill="#f7f3ec" />
            <rect x="36" y="258" width="212" height="10" rx="2" fill="#ddd2c2" />
            {/* Plant on the sill */}
            <g transform="translate(200 258)">
                {([[-10, -34, -24], [4, -44, 6], [16, -30, 34]] as const).map(([x, y, r], index) => (
                    <ellipse key={index} cx={x} cy={y} rx="8" ry="22" fill={index % 2 ? "#4f6d5a" : "#6b8a68"} transform={`rotate(${r} ${x} ${y + 18})`} />
                ))}
                <path d="M-16 -8h32l-4 8h-24z" fill="#c4704b" />
                <path d="M-14 -16h28l-2 10h-24z" fill="#d07f58" />
            </g>
            {/* Framed sketch */}
            <rect x="500" y="66" width="92" height="112" rx="2" fill="#3b302b" />
            <rect x="508" y="74" width="76" height="96" fill="#f6efe4" />
            <path d="M520 150c10-30 22-46 26-46s14 30 26 46" fill="none" stroke="#8a5a44" strokeWidth="3" strokeLinecap="round" />
            <circle cx="560" cy="96" r="7" fill="#d9b48a" />
        </g>
    );
}

/** Jordan: warm grey wall, a large poster and a small shelf with a speaker. */
function Print({ id }: { id: string }) {
    return (
        <g>
            <rect width="640" height="360" fill="#cdc4b8" />
            <radialGradient id={`${id}-soft`} cx="0.8" cy="0.15" r="0.7">
                <stop offset="0" stopColor="#ded6cb" />
                <stop offset="1" stopColor="#ded6cb" stopOpacity="0" />
            </radialGradient>
            <rect width="640" height="360" fill={`url(#${id}-soft)`} />
            {/* Poster */}
            <rect x="452" y="34" width="140" height="186" rx="2" fill="#f1ebe1" />
            <circle cx="522" cy="104" r="40" fill="#e8590c" />
            <rect x="472" y="160" width="100" height="8" rx="4" fill="#17171a" />
            <rect x="472" y="178" width="64" height="8" rx="4" fill="#9c958c" />
            <path d="M452 34h140v6h-140z" fill="#e4dccf" />
            {/* Shelf with a speaker and a small plant */}
            <rect x="34" y="236" width="170" height="8" fill="#a8998a" />
            <rect x="52" y="178" width="44" height="58" rx="6" fill="#3a3d44" />
            <circle cx="74" cy="214" r="13" fill="#25272c" />
            <circle cx="74" cy="192" r="5" fill="#25272c" />
            <g transform="translate(150 236)">
                <ellipse cx="-8" cy="-30" rx="9" ry="20" fill="#5f7d5c" transform="rotate(-22 -8 -14)" />
                <ellipse cx="8" cy="-32" rx="9" ry="22" fill="#4c6a4a" transform="rotate(18 8 -14)" />
                <rect x="-16" y="-14" width="32" height="14" rx="3" fill="#ece5da" />
            </g>
        </g>
    );
}

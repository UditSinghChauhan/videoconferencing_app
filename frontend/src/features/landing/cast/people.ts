import { avatarColorFor } from "../../../lib/format";

export type CastId = "maya" | "aarav" | "sofia" | "jordan";
export type RoomKind = "shelf" | "lamp" | "window" | "print";

export interface CastMember {
    id: CastId;
    name: string;
    /** Avatar hue from the app, so the person on camera matches their initials elsewhere. */
    hue: string;
    skin: { base: string; shade: string; light: string; blush: string; lip: string };
    hair: { base: string; shade: string };
    /** Clothing: the outer layer wears the avatar hue. */
    clothes: { outer: string; outerShade: string; inner: string };
    brow: string;
    room: RoomKind;
    /** Where the person sits in the 640 × 360 frame, and how close to the camera. */
    seat: { x: number; y: number; scale: number };
    /** Head proportions, so the four faces are not one face recoloured. */
    head: { x: number; y: number };
    /** Seconds; offsets idle loops so the four never move in step. */
    phase: number;
}

const shade = (hex: string, amount: number) => {
    const value = Number.parseInt(hex.slice(1), 16);
    const channel = (shift: number) => Math.max(0, Math.min(255, Math.round(((value >> shift) & 255) * (1 + amount))));
    return `#${[16, 8, 0].map((shift) => channel(shift).toString(16).padStart(2, "0")).join("")}`;
};

const dressed = (name: string, inner: string) => {
    const hue = avatarColorFor(name);
    return { hue, clothes: { outer: hue, outerShade: shade(hue, -0.22), inner } };
};

/** The demo cast. Names are the fixtures the app's demo and captures already use. */
export const CAST: Record<CastId, CastMember> = {
    maya: {
        id: "maya",
        name: "Maya Patel",
        ...dressed("Maya Patel", "#efe4d3"),
        skin: { base: "#b67a55", shade: "#99603f", light: "#c98f69", blush: "#c4684f", lip: "#7a3b2d" },
        hair: { base: "#231b1a", shade: "#140f0f" },
        brow: "#231b1a",
        room: "shelf",
        seat: { x: 334, y: 172, scale: 1.12 },
        head: { x: 0.97, y: 1.02 },
        phase: 0
    },
    aarav: {
        id: "aarav",
        name: "Aarav Mehta",
        ...dressed("Aarav Mehta", "#e9e1d2"),
        skin: { base: "#8e5b3c", shade: "#74462d", light: "#a26c4a", blush: "#a2543d", lip: "#4a2419" },
        hair: { base: "#1b1615", shade: "#0f0c0b" },
        brow: "#1b1615",
        room: "lamp",
        seat: { x: 306, y: 174, scale: 1.14 },
        head: { x: 1.06, y: 1 },
        phase: 1.3
    },
    sofia: {
        id: "sofia",
        name: "Sofia Rossi",
        ...dressed("Sofia Rossi", "#f3ede4"),
        skin: { base: "#e3b897", shade: "#cc9a78", light: "#efc9ab", blush: "#df9479", lip: "#a85a4d" },
        hair: { base: "#cfc8bf", shade: "#a9a199" },
        brow: "#8f877f",
        room: "window",
        seat: { x: 344, y: 170, scale: 1.1 },
        head: { x: 1.01, y: 0.98 },
        phase: 2.1
    },
    jordan: {
        id: "jordan",
        name: "Jordan Lee",
        ...dressed("Jordan Lee", "#d9dee6"),
        skin: { base: "#e6c19c", shade: "#cfa47e", light: "#f0d0b0", blush: "#e1a088", lip: "#a8645a" },
        hair: { base: "#191617", shade: "#0d0b0c" },
        brow: "#191617",
        room: "print",
        seat: { x: 318, y: 176, scale: 1.13 },
        head: { x: 0.95, y: 1.03 },
        phase: 0.7
    }
};

export const CAST_ORDER: CastId[] = ["maya", "aarav", "sofia", "jordan"];

export const castByName = (name: string) => Object.values(CAST).find((member) => member.name === name);

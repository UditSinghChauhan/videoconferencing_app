// Prints WCAG 2.1 contrast ratios for the landing palette in DESIGN.md.
// Run: node frontend/scripts/contrast.mjs
const lum = (hex) => {
    const [r, g, b] = hex.match(/\w\w/g).map((h) => parseInt(h, 16) / 255)
        .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
};

const pairs = [
    // [label, foreground, background, minimum]
    ["light text / bg", "#17171a", "#f6f5f2", 4.5],
    ["light text / surface", "#17171a", "#ffffff", 4.5],
    ["light muted / bg", "#5e5d63", "#f6f5f2", 4.5],
    ["light muted / surface-2", "#5e5d63", "#efede8", 4.5],
    ["light rust text / bg", "#b4440a", "#f6f5f2", 4.5],
    ["light on-rust / rust", "#ffffff", "#b4440a", 4.5],
    ["light on-rust / rust-hover", "#ffffff", "#9a3a08", 4.5],
    ["light ink button text", "#ffffff", "#17171a", 4.5],
    ["light focus ring / bg (non-text)", "#e8590c", "#f6f5f2", 3],
    ["light border-strong / bg (non-text)", "#cfcbc2", "#f6f5f2", 1],
    ["light success / bg", "#12805c", "#f6f5f2", 4.5],
    ["frame text / room-bg", "#f3f2ef", "#0c0c0e", 4.5],
    ["frame muted / room-tile", "#a3a2a8", "#1b1b1f", 4.5],
    ["engineering link #ff9a5c / room-bg", "#ff9a5c", "#0c0c0e", 4.5],
    ["figure media label #ff9a5c / room-tile", "#ff9a5c", "#1b1b1f", 4.5],
    ["frame text / room-raised", "#f3f2ef", "#26262b", 4.5],
    ["pause control on ink", "#ffffff", "#17171a", 4.5],
    ["dark text / bg", "#f3f2ef", "#111113", 4.5],
    ["dark muted / bg", "#a3a2a8", "#111113", 4.5],
    ["dark muted / surface", "#a3a2a8", "#1a1a1d", 4.5],
    ["dark rust text / bg", "#ff9a5c", "#111113", 4.5],
    ["dark on-rust / rust", "#111113", "#ff7a33", 4.5],
    ["dark focus ring / bg (non-text)", "#ff7a33", "#111113", 3],
    ["dark success / bg", "#3ccf91", "#111113", 4.5]
];

let failed = 0;
for (const [label, fg, bg, min] of pairs) {
    const r = ratio(fg, bg);
    const ok = r >= min;
    if (!ok) failed += 1;
    console.log(`${ok ? "pass" : "FAIL"}  ${r.toFixed(2).padStart(5)}:1  (min ${min})  ${label}  ${fg} on ${bg}`);
}
process.exitCode = failed ? 1 : 0;

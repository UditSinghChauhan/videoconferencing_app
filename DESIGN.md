# Bridge design system

Bridge is a tool people open a few minutes before a call and close right after. The interface should feel calm and dependable, closer to a well-made notebook than a gaming dashboard. Two surfaces, two moods:

- **Workspace** (landing, auth, dashboard, history, recap): warm paper background, ink text, generous whitespace, a single accent.
- **Room** (lobby and live meeting): always dark and neutral so faces and shared screens carry the colour, never the chrome.

Source of truth for every value below: `frontend/src/styles/tokens.css`.

## Principles

1. **Show the product, not decoration.** No stock photos, no abstract blobs. Marketing visuals are built from the same components the room uses.
2. **One accent, used for meaning.** Signal orange marks the brand, "live" states and focus. It is never a background for long text.
3. **Ink for primary actions.** Primary buttons are near-black on light and near-white on dark; this keeps orange free for status.
4. **Honest copy.** Name what the product does ("recap generated from chat and activity"), including limits ("best for up to 6 people").

## Colour

Semantic tokens, with light and dark values (dark follows `prefers-color-scheme`).

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#f6f5f2` | `#111113` | Page background |
| `--surface` | `#ffffff` | `#1a1a1d` | Cards, inputs, menus |
| `--surface-2` | `#efede8` | `#232327` | Hover, inset areas, chips |
| `--border` | `#e3e0d9` | `#2e2e33` | Hairlines and dividers |
| `--border-strong` | `#cfcbc2` | `#3d3d43` | Input borders |
| `--text` | `#17171a` | `#f3f2ef` | Primary text |
| `--text-muted` | `#5e5d63` | `#a3a2a8` | Secondary text (≥ 4.5:1 on `--bg`) |
| `--accent` | `#e8590c` | `#ff7a33` | Brand mark, live dot, focus ring |
| `--accent-text` | `#b4440a` | `#ff9a5c` | Accent used as text (≥ 4.5:1) |
| `--primary` / `--on-primary` | `#17171a` / `#ffffff` | `#f3f2ef` / `#111113` | Primary buttons |
| `--danger` | `#c4320a` | `#ff6b5a` | Destructive actions, errors |
| `--success` | `#12805c` | `#3ccf91` | Success states |

Room palette (fixed, dark): `--room-bg #0c0c0e`, `--room-tile #1b1b1f`, `--room-raised #26262b`, `--room-text #f3f2ef`, `--room-muted #a3a2a8`, speaking ring = `--accent`.

Participant avatars pick one of six muted hues from a hash of the name, so a person keeps the same colour everywhere.

## Typography

Two families, both self-hosted (no third-party font requests):

- **Geist Variable**: all UI text.
- **Instrument Serif**: display only (landing headline, page titles, recap headings).

Scale (px): 12 · 13 · 14 · 16 · 18 · 22 · 28 · 36 · 48 · 64. Body is 15/16 px at 1.55 line height; headings use tight tracking (-0.02em) and 1.1 line height. Numbers that update live (timers, counts) use `font-variant-numeric: tabular-nums`.

## Space, radius, elevation

- 4 px grid: `--space-1` (4) to `--space-16` (64).
- Radius: `--radius-sm 6`, `--radius-md 10`, `--radius-lg 14`, `--radius-xl 20`, `--radius-full`.
- Shadows are soft and low-contrast (`--shadow-sm`, `--shadow-md`, `--shadow-lg`); dark mode relies on borders instead.

## Motion

150–250 ms, `cubic-bezier(0.2, 0, 0, 1)`, transform and opacity only. Everything is disabled under `prefers-reduced-motion: reduce`.

## Components

- **Button**: `primary` (ink), `secondary` (surface + border), `ghost`, `danger`. Sizes `sm` 32, `md` 40, `lg` 48 px. Loading state keeps the width and shows a spinner.
- **Field**: label above, hint or error below, error linked with `aria-describedby`.
- **Control button** (room): 48 px round, labelled, tooltip with keyboard shortcut, `aria-pressed` for toggles. Off-state for mic/camera is filled red so it reads at a glance.
- **Video tile**: 16:9, radius 14, name chip bottom-left, mic-off badge, accent ring while speaking, avatar when the camera is off, `contain` fit for screen shares.
- **Toast**: bottom-centre, polite live region, auto-dismiss 5 s; errors are `role="alert"`.

## States

Every data view ships loading (skeleton matching the final layout), empty (what it is and the next action), error (what happened and a retry), and success.

## Accessibility

Semantic landmarks, visible `:focus-visible` ring (2 px accent + 2 px offset), every input labelled, keyboard shortcuts documented in tooltips, chat log is `aria-live="polite"`, colour never the only signal (icons and text accompany state).

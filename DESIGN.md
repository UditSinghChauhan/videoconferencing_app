# Bridge design system

Bridge is a tool people open a few minutes before a call and close right after. The interface should feel calm and dependable, closer to a well-made notebook than a gaming dashboard. Two surfaces, two moods:

- **Workspace** (landing, auth, dashboard, history, recap): warm off-white background, ink text, generous whitespace, a single rust accent. The landing page is light only; the rest of the workspace follows the system theme.
- **Room** (lobby and live meeting): always dark and neutral so faces and shared screens carry the colour, never the chrome.

Source of truth for every value below: `frontend/src/styles/tokens.css`.

## Principles

1. **Show the product working, with people in it.** Marketing visuals are the app's real components rendered as HTML with fixture data (no screenshots, no video). A calling product shows faces: the landing uses an original illustrated cast (see "Cast" below), never stock photos and never AI-generated photographs of people.
2. **One idea per page, each visual idea once.** The landing page exists to show one transformation: a live call becomes a written recap when the host presses End. The call grid is drawn once (the hero); every other section shows a different piece of the product.
3. **One accent, used for meaning.** Rust marks the brand, "live" states, focus, the speaking ring, decisions in the recap, and, on the landing page only, the single most important action in view. It is never a background for long text.
4. **Ink for primary actions in the app.** Inside the product, primary buttons are near-black on light and near-white on dark; this keeps rust free for status. The landing page is the one exception (see below).
5. **Depth and motion are allowed when they explain.** Soft shadows lift product cards off the canvas; motion shows cause and effect (the ring follows the voice, End turns the call into notes). Decoration for its own sake is still out.
6. **Honest copy and honest numbers.** Name what the product does ("recap generated from chat and activity"), including limits ("best for up to 6 people"). Every number is measured or counted in code.

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
| `--accent` | `#e8590c` | `#ff7a33` | Brand mark, live dot, focus ring (non-text, ≥ 3:1) |
| `--accent-text` | `#b4440a` | `#ff9a5c` | Rust used as text, and the landing accent action fill (≥ 4.5:1) |
| `--primary` / `--on-primary` | `#17171a` / `#ffffff` | `#f3f2ef` / `#111113` | Primary buttons |
| `--danger` | `#c4320a` | `#ff6b5a` | Destructive actions, errors |
| `--success` | `#12805c` | `#3ccf91` | Success states |

Room palette (fixed, dark): `--room-bg #0c0c0e`, `--room-tile #1b1b1f`, `--room-raised #26262b`, `--room-text #f3f2ef`, `--room-muted #a3a2a8`, speaking ring = `--accent`.

Measured contrast lives in `frontend/scripts/contrast.mjs` (`node frontend/scripts/contrast.mjs`, exits non-zero on a failure). Results are in the landing section below.

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

App UI: 150–250 ms, `cubic-bezier(0.2, 0, 0, 1)`, transform and opacity only. The landing page has its own motion rules (below). Everything has a `prefers-reduced-motion: reduce` path that shows the final state instantly.

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

---

# Landing page (`/`)

v3, since 2026-11-03. Reasoning, the before/after measurements and the bydefault.so study: `docs/LANDING_V3.md`. Engineering material that used to be on the page lives in `docs/CASE_STUDY.md`.

The reader is a recruiter or hiring engineer with about five seconds. In that time they must learn what Bridge does (**a call that ends in a written recap**), see that it is real, and want to click the live demo. Fewer, better things: seven sections, about 5,700 px at 1440 and under 8,000 px at 390.

## Visual system (landing only)

The page re-declares the light tokens on its root (`LandingPage.module.css`), so it never follows the dark theme; the app keeps both.

| Role | Value | Notes |
|---|---|---|
| Canvas `--bg` | `#fbfaf8` | Page ground |
| Surface | `#ffffff` | Cards |
| Hairline | `#eceae6` | Rails, dividers, card borders |
| Ink | `#17171a` | Text |
| Muted | `#6b6a70` | Secondary text, 5.13:1 on canvas, 5.36:1 on white |
| Rust | `#b4440a` | Italic "recap", the CTA fill (white on rust 5.57:1) |
| Room colours | dark room palette | Only inside the call window and small call fragments |

- **Rails**: 1 px hairline verticals at the 1200 px container edges for the full page height (12 px from the screen edge below 1240 px). Hairline dividers between sections cross the full width, with a small "+" where they meet each rail.
- **Type**: h1 Instrument Serif 48–84 px with the italic rust "recap"; h2 Geist 500, 28–36 px, -0.02em, centred, with a 13 px muted label pill above; body Geist 17 px; product UI 13–14 px, never smaller.
- **Cards**: white, radius 16, 1 px hairline, `0 1px 2px rgb(0 0 0/4%), 0 12px 32px -16px rgb(0 0 0/12%)`; header row 44 px with a 13 px label.
- **Motion**: reveal = opacity 0→1 and y 12→0, 500 ms `cubic-bezier(0.16,1,0.3,1)`, 50 ms stagger, once (`Reveal.tsx`, CSS + one observer, so it costs nothing at first paint). Hover lift 2 px with a deeper shadow, 200 ms. Nav change 250 ms. The hero loop and section vignettes are CSS driven by state; `motion/react` runs the deferred sections' in-view triggers and the copy toast. No pinned or scroll-scrubbed sections. Every animation has a reduced-motion path that shows the final state.

## Sections

1. **Nav** (`nav/`): logo; How it works, Features, FAQ; Sign in; "Try the demo". Transparent at the top; after 24 px it becomes a floating bar (inset 12 px, max 1200 px, radius 14, white 85 % with `blur(16px)`, hairline and shadow), so headings never show through it. No GitHub link.
2. **Hero card** (`hero/HeroDemo.tsx`): h1, one sub line, "Try the live demo", "Start a meeting →", "No account needed for the demo". One composition: a light-chrome app window (white top bar, room code, Live dot) holding the dark 2×2 call, and the white recap card (summary + two action items). An 8 s loop in the DOM that starts and resets on the bright live call: the speaking ring moves between three people, End is pressed, the call dims for 1.3 s (never longer than 1.5 s, never the first frame) while the recap writes in, then the call brightens and the card holds the focus until the loop returns to the live call. Under reduced motion it shows the bright call with the finished card. Pauses off screen and in background tabs.
   - **Desktop (≥ 900 px):** the window is centred while the call runs. When the recap arrives, the window moves to the left edge (500 ms, `cubic-bezier(0.16,1,0.3,1)`) and the card docks to its right, travelling with it and reaching only 56 px over the window's edge: the outer ~11 % of the right-hand tiles, never a face (faces sit in the middle 36–64 % of a tile) and never End. The summary and both items are written ~700 ms into a 3.4 s hold; "Action items" and its first item arrive as one block.
   - **Tablets and phones:** the card is always present, overlapping only the bottom 12% of the grid (computed from the stage width; the lower 24% of the bottom tiles, below every chin, never a whole tile), showing the summary and two action items, and its lines rebuild in place when End is pressed, so it is never blank and its height never changes. The control bar is dropped and End moves into the top bar. Below 600 px the tile name chips show the first name only, 12 px, compact, top-left; at 360 px and below they dock into the tile corner as a tab. Measured clear of every face from 320 to 768 px.
3. **Benefit strip**: three hairline cells in user language.
4. **How it works** (`how/`): three cards, each a different vignette (lobby device check with the speaking ring; invite link "Copied" and people joining; a mini recap). Each plays once on reveal. Never the 2×2 grid.
5. **Features** (`product/`): one large card with the real `RecapView` rendering this stand-up's recap, a working Copy as Markdown and a toast, and the first ten lines of the actual export fading out; the recap pane takes the left column's height and fades at the card's foot, so neither column is empty. Due dates sit in a fixed right-aligned column with an em dash when there is none. Then a bento: chat, host remove with a one-row confirm that stays inside its card at every width, and screen share (a shared slide filling the tile, "Maya is presenting", her thumbnail in the corner), all playing on hover or keyboard focus; "Back after a drop", a 4 s loop (Reconnecting… with the video dimmed, the bars refill, "Back in the call"); and a meeting-history card.
6. **FAQ** (`faq/`): five questions, an accordion with a grid-rows height animation.
7. **Final CTA**: the page's only dark band, a rounded dark card inside the rails. Above the headline, the four monograms fold into a small recap card once on reveal (CSS on the Reveal's `data-shown`); the subtitle is `text-wrap: balance`. Footer on the light canvas with the credit.

## Rules

- **Each visual idea once.** Before adding a visual, check it is not already on the page.
- **Claims are checkable.** Every claim in `features/landing/content.ts` names a file and a line that must exist; `content.test.ts` fails the build if one stops matching. The recap on the page is the summariser's real output (`fixtures.ts`), never typed by hand.
- **No invented features or numbers.** Where the page needed a feature the app lacked (the confirm before removing someone), the feature was built first.
- **Avatars under 28 px are monograms**: the person's hue and initials (`parts/People.tsx`), never a few pixels of a cropped face. A team commitment ("Everyone") shows the team's avatar stack, never the word. Stacks show at most two people then a "+N" chip, 24 px circles (22 px is the floor), a 2 px white ring and -6 px overlap, the first person on top, with the initials of a tucked circle moved into its visible part.
- **People are the illustrated cast** (`cast/`), never stock or generated photos. Seats are centred at the same distance, so every crop keeps the face; no hands (they floated free of the body at small sizes).

## Cast

Four original illustrated people stand in for call participants: Maya Patel, Aarav Mehta, Sofia Rossi and Jordan Lee. Each wears their avatar hue from `avatarColorFor`. Layered SVG, flat shading, each in their own room; breathing, a jittered blink and small head tilts, and the mouth moves only while that person speaks. `crop="face"` gives the head-and-shoulders chip used for owners and history. `/__cast` (development only) shows all four.

### Performance

Below the hero, How it works and Features load as they approach the viewport (`Deferred.tsx`, with measured placeholder heights so nothing moves). The three above-the-fold fonts are preloaded by a small Vite plugin. Lighthouse mobile on the production build (2026-11-03): 97–98 performance, 100 accessibility, 100 best practices, 100 SEO; LCP 2.0–2.2 s, CLS 0.

## Live demo and the backend wake-up

`/demo` is fully client-side (no API calls). Maya, Aarav and Jordan are the illustrated cast (the same `cast/Avatar` the hero uses, passed to the room's `VideoTile` as an illustrated feed): they breathe, blink and talk while the ring is on them. The visitor walks into a scripted stand-up (`demo/demoScript.ts`): the clock starts at 0:00, three teammates speak in turn for about 32 s and post seven messages that the real summariser turns into a summary, four owned action items (three with a day) and four topics (`demoScript.test.ts` holds it to that); then "End the call to see the recap" appears beside End. The recap's date is the moment the visitor joined. Load time is about 1.4 s from click to lobby and 1.5 s to a four-person room on a warm CDN. It never waits on the backend. The wait recruiters hit is on **Start a meeting / Sign in**, which call `bridge-backend-7sul.onrender.com`: measured cold start 22.6 s for `/api/v1/health`, 0.6 s warm.

Spec:

- On landing page load, fire one `GET /api/v1/health` in the background (no UI), so the server is usually awake by the time someone clicks.
- On the auth form, if a request has not answered after 2 s, show an inline status under the submit button (polite live region): "Waking the server. Free hosting sleeps when idle; this takes up to 30 seconds." with elapsed seconds in tabular numbers. The button keeps its spinner and width. Not a toast, not a blank wait.
- Raise the client timeout for auth and meeting creation from 20 s to 60 s; 20 s is shorter than the measured cold start, so today the first request after idle can fail.
- Measure click to usable room by script (`frontend/scripts/measure-wake.mjs`): landing click → `/demo` lobby → room with four tiles, and landing click → signed-in dashboard on a cold and a warm backend. Report both numbers in the PR.

## Accessibility (landing)

- Landmarks: `header`, `nav`, `main`, `footer`; every section has a heading and `aria-labelledby`.
- The hero composition and the vignettes are decorative (`aria-hidden`); their meaning is in the text beside them.
- Feature cards are focusable groups, so keyboard users get the same demo as a hover; the FAQ rows are buttons with `aria-expanded` and `aria-controls`.
- Touch targets ≥ 44 px for the hero, CTA and footer links.
- Axe: zero WCAG 2.1 AA violations on `/` (`accessibility.spec.js`).

---

## Decision log

### 2026-11-01: "Faces in, notes out."

The landing page was correct and forgettable: no faces anywhere, a blank first frame, unreadable product UI and a summariser bug visible in its Topics chips. Rules that made it calm ("no shadows at rest", "no decorative icons", "no scroll library") also made it flat. Decision: rebuild the landing around the single transformation the product performs, at hero scale, with an original illustrated cast standing in for participants, soft depth on product frames, and scroll-linked motion with `motion/react` on native scroll. Kept: the art direction (Instrument Serif with the italic rust "recap", Geist, warm paper, one rust accent, the dark room palette) and the Decisions section. Still banned: blob gradients, glassmorphism, fake logos or testimonials, invented metrics, scroll-jacking, stock or generated photos of people. Reasoning and references: `docs/REVAMP.md`.

### 2026-11-03: Landing v3, fewer and better things

v2 proved the product was real but repeated itself: the four-person grid six times, heavy black frames on a light page, a 7-link nav and four sections of engineering documentation, at 11,969 px on desktop. Decision: seven sections, light only, structured like bydefault.so (rails, a hero card, a floating nav, small centred headings, product UI as HTML cards, one dark band, an FAQ). The engineering material moved to `docs/CASE_STUDY.md`. The recap engine was fixed first, because the page shows its output. Reasoning: `docs/LANDING_V3.md`.

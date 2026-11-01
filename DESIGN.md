# Bridge design system

Bridge is a tool people open a few minutes before a call and close right after. The interface should feel calm and dependable, closer to a well-made notebook than a gaming dashboard. Two surfaces, two moods:

- **Workspace** (landing, auth, dashboard, history, recap): warm off-white background, ink text, generous whitespace, a single rust accent.
- **Room** (lobby and live meeting): always dark and neutral so faces and shared screens carry the colour, never the chrome.

Source of truth for every value below: `frontend/src/styles/tokens.css`.

## Principles

1. **Show the product working, with people in it.** Marketing visuals are recordings of the running app or real components rendered with fixture data. A calling product shows faces: the landing uses an original illustrated cast (see "Cast" below), never stock photos and never AI-generated photographs of people.
2. **One idea per page.** The landing page exists to show one transformation: a live call becomes a written recap when the host presses End ("Faces in, notes out."). Every section builds toward that moment or explains it.
3. **One accent, used for meaning.** Rust marks the brand, "live" states, focus, the speaking ring, decisions in the recap, and, on the landing page only, the single most important action in view. It is never a background for long text.
4. **Ink for primary actions in the app.** Inside the product, primary buttons are near-black on light and near-white on dark; this keeps rust free for status. The landing page is the one exception (see below).
5. **Depth and motion are allowed when they explain.** Soft shadows lift product frames off the paper; motion shows cause and effect (the ring follows the voice, the call folds into notes). Decoration for its own sake is still out.
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

The landing page is a portfolio piece. Its reader is a recruiter or hiring engineer with about five seconds of attention. In that time they must learn what Bridge does (**a call that ends in a written recap**), see that it is real, and want to click the live demo. Everything after the fold exists to convince them the builder is a strong product engineer.

Identity carried over from the app: warm off-white `--bg` with a faint warm grain, Instrument Serif headline with an italic rust accent word, rust (not orange-red, not lime) as the only accent, the dark room palette, and the Decisions section. Creative direction since 2026-11-01: **"Faces in, notes out."** (references and reasoning in `docs/REVAMP.md`).

## Rules

1. **One accent action per viewport.** At any scroll position at most one rust-filled button is visible. Other actions are outline (`secondary`) or text links.
2. **Faces first.** The first frame on desktop and on a phone shows the four-person call with the cast's faces. Product frames are hero-scale (up to 1200 px) and the UI inside them is legible: no product text under 13 px at 1440 px.
3. **Soft depth on product, flat on text.** Product frames carry `--shadow-lg` at rest and sit in a faint warm radial light; bento tiles carry `--shadow-sm` and lift to `--shadow-md` on hover. Text sections stay flat. The paper has a faint warm grain (an inline SVG noise at 3–4 % opacity, no image request). No blob gradients, no glass, no blur panels.
4. **Icons only when they mean something.** The GitHub mark on an outbound link, pass marks, mic-off and status badges inside product UI. No icon-topped feature cards.
5. **Every product image is the running app or its real components.** Recordings come from `frontend/scripts/capture-landing.mjs` (the app, with the illustrated cast fed in as fake camera and microphone). Scroll-scrubbed and bento demos render the real room and recap components with fixture data. Sized media, `loading="lazy"` below the fold, `width`/`height` set.
6. **Claims are checkable.** Every engineering note links to the file that does it, and every Verified flow names its Playwright test. `src/features/landing/content.test.ts` fails the build if a test title, a step inside it, or a linked file stops existing. Durations shown in the Verified terminal come only from a real Playwright JSON report; without one they are omitted.
7. **Section-aware navigation.** The nav is solid paper at the top, becomes translucent paper with a hairline after 40 px of scroll, and switches to the dark tokens (150 ms crossfade) while it sits over a dark section.
8. **Native scroll only.** Pinned stages use `position: sticky` and read scroll progress; nothing hijacks, smooths or snaps the scroll.

## Cast

Four original illustrated people stand in for call participants on the landing page: Maya Patel, Aarav Mehta, Sofia Rossi and Jordan Lee (the names the fixtures already use). Each wears their avatar hue from `avatarColorFor`, so the person on camera matches their initials elsewhere.

- Layered SVG, soft flat shading, warm palette that sits on paper and room tokens, diverse in skin tone, hair, age and setting. Not photoreal, not mascots, not emoji, no resemblance to any real or known character.
- Each sits in their own simple room (lamp, shelf, window, plant) so a tile reads as a webcam feed.
- Alive, not static: breathing (scale 1.000–1.006), a blink every 3–6 s with jitter, small head tilts; mouth and a hand gesture only while that person is speaking. Under reduced motion they hold a neutral pose.
- Components live in `frontend/src/features/landing/cast/`; `/__cast` (development only) shows all four.

## Colour (landing)

The landing page uses the workspace tokens above. Two roles are added:

| Role | Light | Dark | Use |
|---|---|---|---|
| `--cta` / `--on-cta` | `#b4440a` / `#ffffff` | `#ff7a33` / `#111113` | The single accent action in view |
| `--cta-hover` | `#9a3a08` | `#ff9a5c` | Hover and pressed |
| `--frame` | `#0c0c0e` | `#0c0c0e` | App-window chrome around captures (same as `--room-bg`) |

Dark mode: the landing follows `prefers-color-scheme` like the rest of the app, but the hero and walkthrough captures are always of the light workspace and the dark room, so they look the same in both modes.

Measured by `node frontend/scripts/contrast.mjs` (WCAG 2.1 relative luminance):

| Pair | Ratio | Needs |
|---|---|---|
| Text `#17171a` on bg `#f6f5f2` | 16.41:1 | 4.5 |
| Text on surface `#ffffff` | 17.89:1 | 4.5 |
| Muted `#5e5d63` on bg | 5.98:1 | 4.5 |
| Muted on surface-2 `#efede8` | 5.57:1 | 4.5 |
| Rust text `#b4440a` on bg (italic accent word, eyebrows) | 5.11:1 | 4.5 |
| White on rust `#b4440a` (accent action) | 5.57:1 | 4.5 |
| White on rust hover `#9a3a08` | 7.04:1 | 4.5 |
| White on ink `#17171a` | 17.89:1 | 4.5 |
| Focus ring `#e8590c` on bg | 3.28:1 | 3 (non-text) |
| Success `#12805c` on bg | 4.51:1 | 4.5 (marginal: use for the pass glyph only, never body text) |
| Frame text `#f3f2ef` on `#0c0c0e` | 17.46:1 | 4.5 |
| Frame muted `#a3a2a8` on tile `#1b1b1f` | 6.78:1 | 4.5 |
| Dark: text `#f3f2ef` on `#111113` | 16.85:1 | 4.5 |
| Dark: muted `#a3a2a8` on bg / surface | 7.45 / 6.86:1 | 4.5 |
| Dark: rust text `#ff9a5c` on bg | 9.01:1 | 4.5 |
| Dark: `#111113` on rust `#ff7a33` (accent action) | 7.26:1 | 4.5 |
| Dark: success `#3ccf91` on bg | 9.45:1 | 4.5 |

`--border-strong` on `--bg` is 1.48:1, so borders are never the only boundary of an interactive control; buttons also carry a fill or a label.

## Type scale (landing)

Same two families. Sizes come from the workspace scale; the display size is the only fluid value.

| Role | Family | 375 px | 768 px | 1280 px | Line height | Tracking |
|---|---|---|---|---|---|---|
| Display (h1) | Instrument Serif, italic accent word | 48 | 64 | 80 | 1.0 | -0.02em |
| Section title (h2) | Instrument Serif | 36 | 48 | 48 | 1.1 | -0.02em |
| Outcome statement | Instrument Serif | 28 | 28 | 36 | 1.15 | -0.01em |
| Step title (h3) | Geist 600 | 18 | 22 | 22 | 1.3 | -0.01em |
| Lede / support line | Geist 400 | 18 | 18 | 18 | 1.5 | 0 |
| Body | Geist 400 | 16 | 16 | 16 | 1.55 | 0 |
| Eyebrow | Geist 500 | 13 | 13 | 13 | 1.4 | 0.02em |
| Meta, captions, figure labels | Geist 400 / mono for codes | 14 | 14 | 14 | 1.45 | 0 |

Nothing on the landing page is smaller than 14 px (the current page has 10 to 14 text nodes under 12 px at each width, all inside the illustrated mockup). Display uses `clamp(3rem, 1.9rem + 4.7vw, 5rem)`. Measure is capped at 60ch for body, 34ch for the lede.

## Spacing and layout

- 4 px grid, existing `--space-*` tokens, plus `--space-24` (96) and `--space-32` (128) for section rhythm on the landing page only.
- Content width 1120 px; app-window frame max 1040 px, centred.
- Section padding (block): 64 px at 375, 96 at 768, 128 at 1280. Gutters: 20 / 32 / 40 px.
- Breakpoints: `< 640` (single column, stacked walkthrough, vertical architecture list), `640 to 1023` (single column, sticky walkthrough pane above text), `>= 1024` (two columns).
- App-window frame: radius `--radius-xl` (20), 1 px `--border`, `--shadow-lg`, a 36 px top bar in `--frame` with the room URL in mono 13 px. No traffic-light dots (they imply macOS and are decoration).

## Motion

The landing page uses `motion` (motion/react) for scroll-linked and in-view motion. Native scroll only.

| What | Duration | Easing | Property |
|---|---|---|---|
| Entrances (sections, cards, recap lines) | 500–700 ms, staggered 60–90 ms | `cubic-bezier(0.16, 1, 0.3, 1)` (`--ease-out-expo`) | opacity, translateY 16–24 px |
| Controls (buttons, links, nav, chips) | 150–250 ms | `--ease` | background-color, colour, transform scale 0.98 on press |
| Nav theme crossfade | 150 ms | `--ease` | background-color, colour, border-colour |
| Hero frame settle | scroll-linked | linear map of progress | scale 0.92 → 1, radius 20 → 12 |
| Signature chapter | scroll-linked, about 300vh, both directions | progress segments | transform, opacity, filter |
| Walkthrough camera | 600 ms spring (no bounce) | spring | transform (translate, scale) |
| Bento micro-demos and architecture packets | 4–8 s loops, paused off screen | `--ease-out-expo` | transform, opacity |
| Cast idle | breathing 4–5 s, blink 120 ms | sine / ease | transform |

Only transform, opacity and filter animate (colour transitions on controls excepted). Every animation has a `prefers-reduced-motion: reduce` path that shows the final state instantly: the hero shows a poster of the grid beside its recap, the signature chapter becomes four static blocks, loops do not run, counters show their final value. Videos and loops pause when off screen.

## Section-by-section spec

### 1. Navigation

Logo left. Links: Walkthrough, Engineering, Decisions, Verified (anchors; hidden under 768 px). Right: "Sign in" text link and "GitHub" text link with the GitHub mark. Solid `--bg`, no border, no blur. No filled button in the nav, so the hero's accent action is the only one in the first viewport.

### 2. Hero (first viewport)

Centred, one column at every width.

- h1: "Meetings that end with a *recap*." (kept; italic rust "recap").
- One support line, max 34ch, in full ink: "Video calls for small teams. When the host ends one, everyone gets the key points and the full transcript."
- Two actions: **Try the live demo** (rust, the accent action; goes to `/demo`, no account) and **Start a meeting** (ink outline; signed in → `/home`, otherwise `/auth?mode=signup`). The demo is first because it needs nothing from the visitor.
- Below, centred app-window frame (ToDesktop framing) holding the **20 s muted loop**, cut so the recap dominates: 0–5 s the last two messages of a live four-person call and the host pressing End; 5–20 s the recap page, holding on the key points, then gliding to the transcript. Recorded at 2x and encoded at 1920 × 1200 (about 540 KB, H.264 first). A Pause control sits in the window bar, never over the recording (WCAG 2.2.2); the loop also pauses off screen. The poster frame, and the reduced-motion image, is the finished recap, so a still visitor still sees the outcome. Caption under the frame in 14 px muted: "Recorded from the running app. The recap is built on the server from the chat and activity log, no external AI."
- At 1280 × 800 the headline, support line, both actions and the top 40 % of the frame (enough to see the recap heading) are above the fold. At 375 × 812 the frame starts above the fold.

### 2b. Facts

Directly under the hero frame, one `--surface` panel with three facts, each a large serif value and one line: **0.4 s** from End to the recap on screen (measured with `scripts/measure-wake.mjs`), **0 bytes** of media through the server, and **N flows** tested end to end (N is counted from the Verified list in code, so the two cannot disagree). No vanity numbers: every value is measured or structural.

### 3. Walkthrough: Start, Share, Recap

Title: "From link to recap." Two columns at ≥ 1024 px: text left (4 of 12 columns), sticky product pane right (8 of 12), pane `position: sticky; top: 96px`. Each step is one block of text about 70vh tall so scrolling advances one step at a time. The active step is `--text` with a 2 px rust rule at its left; inactive steps use `--text-muted` (5.98:1, so they stay readable). Colour, not opacity, marks the active step, because 0.45 opacity on ink would fall below 4.5:1.

| Step | Text (left) | Product state (right pane, a capture) |
|---|---|---|
| **1. Start** | "One click makes a room with a readable code like `kmt-vrqp-xhw`. The lobby checks your camera and mic, then hands you the link." | The room just after the host joins: a single host tile, the invite link copied ("Link copied" confirmation visible), the meeting code in the top bar, timer at 00:0x. |
| **2. Share** | "People join from the browser with no install. You see who is speaking, who is muted, and the chat, in real time." | The same room with four people: speaking ring on one tile, a mute badge on another, chat panel open with three to four messages about a release and a deadline. |
| **3. Recap** | "When the host ends the call, the server writes the recap: key points, highlights, topics and the full transcript, saved to everyone's history." | The recap page for that meeting: heading "Meeting recap", meta (duration, people), Key points list, topic chips, and the chat transcript section expanded below. |

Each pane image has real alt text describing the state, e.g. "Bridge room with four participants; Maya is speaking, Jordan is muted, chat shows three messages."

The pane zooms each capture to a crop (`crop` in `content.ts`, in capture pixels) so interface text shows near its real size: Start shows the whole new room, Share the tiles and chat, Recap the content column below the app header, gliding down to the transcript. Step titles are serif at 48 px.

Below 1024 px there is no sticky pane (a band covering half a tablet screen hid the text it described): each step is its text followed by its own capture, wide on tablets and phone-size under 640 px.

### 4. Outcomes (replaces the six icon cards)

Three statements, no icons, no boxes: a typographic row of three columns, each a serif statement (28 px) with its supporting sentence below (stacked below 1024 px).

1. **"Everyone leaves with the same notes."** Ending the call produces a recap of key points and the transcript, kept in history and copyable as Markdown.
2. **"A host can remove anyone, and the server enforces it."** Removing someone or ending the call is checked by the API, not just hidden in the interface.
3. **"Join from a link, in a browser, in seconds."** No install, a lobby to check your devices first, and a dropped connection rejoins on its own.

Implementation detail from the old cards (token rotation, CSRF, reconnect handling, second-tab handover) moves to section 5.

### 5. Engineering (kept, the differentiator)

Kept on the dark surface (`--room-bg`) as the page's one change of mood. Title kept: "Built like a product, documented like a system." Lede kept (peer-to-peer media, server only authenticates, relays and records; trade-off is upload bandwidth, so about six people; larger rooms need an SFU).

**Architecture figure, one clean figure.** A single `<figure>` with a `<figcaption>`, drawn as inline SVG at ≥ 640 px so the lines are exact:

- Top row: Browser A and Browser B, joined by one dashed rust line labelled "media, peer to peer (WebRTC)".
- Both browsers connect down to one Node.js API node with a solid line each, labelled once "signalling (Socket.IO) + REST". This fixes the current figure, where only one stem leaves the browser row, so it reads as if Browser B alone talks to the server.
- API to MongoDB, labelled "users · sessions · meetings · activity · recaps".
- Labels at 14 px, nodes with name (Geist 600) and stack line (14 px muted).

**Under 640 px** the SVG is replaced by an ordered list that says the same thing in reading order:
1. Browser A ⇄ Browser B: media, peer to peer over WebRTC.
2. Each browser → Node.js API: Socket.IO signalling and REST, authenticated with a JWT.
3. Node.js API → MongoDB: users, sessions, meetings, activity and recaps.

Under the figure, a two-column list (one column under 640 px) of engineering detail, each with a link to the file that implements it: WebRTC mesh with perfect negotiation; Socket.IO signalling with an authenticated handshake; sessions (15-minute access tokens, rotating refresh tokens in httpOnly cookies, CSRF check, sign out everywhere); reconnects and second-tab handover; Zod-validated routes with server-side roles; a deterministic rule-based summariser (no external AI). Actions: "Read the architecture notes" (white outline on dark, not rust, so this viewport has no accent action competing with the Verified row) and "Source on GitHub" text link.

### 5b. Decisions: "Why it is built this way."

Three trade-offs, each stated the way it would be in a design review: the decision (serif, 28 px), then **Why.** and **Trade-off.** One `--surface` panel per decision, decision on the left, reasoning on the right. Content: peer-to-peer mesh rather than an SFU; a rule-based recap rather than an LLM; short access tokens with rotating, hashed, replay-checked refresh tokens. Every claim is checked against the code before it ships.

### 6. Verified

Title: "Verified end to end." One line: "Each flow runs in a real browser against the real API in CI-style Playwright tests." Then one `--surface` panel with a row per test: the flows that test proves (pass glyph in `--success`, `aria-hidden`, with "passing" for screen readers) and the test's title in `<code>`, so each title appears once. The intro sentence links to the spec on GitHub.

Flows requested, and what exists today in `frontend/tests/e2e/meeting-system.spec.js` (as of `master` `fe317a5`):

| Flow | Test today | Status |
|---|---|---|
| Register | `signUp()` helper, used by every lifecycle test | exists |
| Login | none: e2e only checks empty-form validation on `/auth` | **missing** |
| Session persistence after refresh | none: no test reloads the page while signed in | **missing** |
| Create and join | "two people meet, chat, …" (host creates, guest joins by link) | exists |
| Chat | same test, chat both ways | exists |
| Host-only removal | same test, host removes guest; guest sees "You were removed" | exists (UI); the guest-cannot-remove half is not asserted |
| End meeting and summary | same test, ends and lands on the recap with Key points | exists |
| 403 on unauthorised summary access | "people outside a meeting cannot read its recap" asserts the UI message, not the HTTP status | **partial** |

Resolved in build: the missing tests were written (sign-in and reload persistence; a participant's remove call asserted as `403`; the outsider's recap request asserted as HTTP `403`).

### 7. Closing call to action

Serif line: "See a call turn into its recap." One accent action: **Try the live demo**. A text link: "or create an account". Then the builder's line: designed, engineered and tested end to end by Udit Singh Chauhan, with links to GitHub and LinkedIn. No icon.

### 8. Footer

Logo, "Designed and built by Udit Singh Chauhan" (link), GitHub link, LinkedIn link. 14 px muted.

## Live demo and the backend wake-up

`/demo` is fully client-side (no API calls), measured at about 1.4 s from click to lobby and 1.5 s to a four-person room on a warm CDN. It never waits on the backend. The wait recruiters hit is on **Start a meeting / Sign in**, which call `bridge-backend-7sul.onrender.com`: measured cold start 22.6 s for `/api/v1/health`, 0.6 s warm.

Spec:

- On landing page load, fire one `GET /api/v1/health` in the background (no UI), so the server is usually awake by the time someone clicks.
- On the auth form, if a request has not answered after 2 s, show an inline status under the submit button (polite live region): "Waking the server. Free hosting sleeps when idle; this takes up to 30 seconds." with elapsed seconds in tabular numbers. The button keeps its spinner and width. Not a toast, not a blank wait.
- Raise the client timeout for auth and meeting creation from 20 s to 60 s; 20 s is shorter than the measured cold start, so today the first request after idle can fail.
- Measure click to usable room by script (`frontend/scripts/measure-wake.mjs`): landing click → `/demo` lobby → room with four tiles, and landing click → signed-in dashboard on a cold and a warm backend. Report both numbers in the PR.

## Accessibility (landing)

- Landmarks: `header`, `nav`, `main`, `footer`; every section has an `h2` and `aria-labelledby`.
- Focus order follows reading order; the sticky pane is not focusable; captures are `img` with alt text, not inert DOM copies of the room.
- The hero video has `aria-label` describing the sequence and no audio track; under reduced motion it is not rendered.
- Touch targets ≥ 44 px for the two hero actions and the closing action.
- Axe: zero WCAG 2.1 AA violations on `/` (existing `accessibility.spec.js` covers `/`).

---

## Decision log

### 2026-11-01: "Faces in, notes out."

The landing page was correct and forgettable: no faces anywhere, a blank first frame, unreadable product UI and a summariser bug visible in its Topics chips. Rules that made it calm ("no shadows at rest", "no decorative icons", "no scroll library") also made it flat. Decision: rebuild the landing around the single transformation the product performs, at hero scale, with an original illustrated cast standing in for participants, soft depth on product frames, and scroll-linked motion with `motion/react` on native scroll. Kept: the art direction (Instrument Serif with the italic rust "recap", Geist, warm paper, one rust accent, the dark room palette) and the Decisions section. Still banned: blob gradients, glassmorphism, fake logos or testimonials, invented metrics, scroll-jacking, stock or generated photos of people. Reasoning and references: `docs/REVAMP.md`.

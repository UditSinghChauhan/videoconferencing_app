# Landing v3: fewer, better things

Status: implemented on `feat/landing-v3`. Before and after screenshots live in `docs/screenshots/landing-v3/`.

## Why a third version

v2 ("Faces in, notes out") proved the product was real, but it said so six times. Measured on 2026-11-03 before any change:

| | Desktop 1440 | Phone 390 |
|---|---|---|
| Page height | 11,969 px | 15,723 px |
| Times the 4-person call grid is drawn | 6 (hero, pinned chapter, 3 walkthrough steps, 2 bento tiles, closing loop) | same |
| Dark surfaces | black browser bar, black room frames on every capture, a full black Engineering band | same |
| Nav | 7 links + Sign in + GitHub, translucent: headings show through it | wraps to a menu |

Content that was engineering documentation rather than product marketing (Engineering notes, the architecture figure, Decisions, Verified, the 0.4 s / 0 bytes / 8 flows panel and `/design-notes`) moved to `docs/CASE_STUDY.md`.

The recap the page showed off also looked machine-made: "The meeting focused mainly on release checklist, onboarding fix, release plan and involved Maya Patel, Aarav Mehta, Sofia Rossi, Jordan Lee.", key points that were raw chat lines ("Aarav Mehta: The onboarding fix…"), a host shown as `@maya_epkkn`, and a demo that lasted "1 min". v3 fixes the summariser first (see "Recap output" below), because the page is only as good as the thing it shows.

## Reference study: bydefault.so

Studied at 1440 × 900 and 390 × 844 with Playwright on 2026-11-03, scrolled top to bottom (desktop 10,463 px, phone 13,646 px). Techniques only; none of its brand, copy or assets are used.

1. **Canvas and rails.** The page ground is a near-white grey (`rgb(247 247 247)`); content cards are white. Two 1 px hairline verticals run the full page height at the container edges (about 1190 px apart), so every section sits inside the same visible column. Between sections a hairline horizontal crosses the rails, and a small "+" mark sits where the two meet. On a phone the rails sit right at the 8–16 px gutter.
2. **Hero in a card.** The first screen is a white card with a 12–16 px radius inside the rails, lifted by a layered, very soft shadow (`0 17px 23px rgb(0 0 0/4%)` stacked with three smaller ones and a `0 0 0 1px rgb(0 0 0/5%)` ring) instead of a border. Centred headline, one sub line, one input + accent button, one small social line.
3. **Nav that becomes a floating bar.** At the top the nav is a plain row: logo, four text links centred, Sign in as text, one small accent button. After scrolling it becomes a white rounded bar (radius 16, inset about 6 px from the top, the width of the container) with a soft shadow; links stay the same, nothing else changes. On a phone it is logo, the accent button and a menu icon, also floating.
4. **Small centred section headings.** Each section opens with a tiny muted label (a 13 px pill with an icon, e.g. "How it works", "FAQ"), then a 44 px Geist 500 heading tracked -0.02em, then one or two muted sentences, all centred. Headings are short statements, not slogans.
5. **Product UI as real HTML.** Every product picture is live markup inside a white card with a header row (a 40–44 px row with a small label and sometimes a status on the right), table rows separated by hairlines, small brand icons, real-looking numbers. Nothing is a screenshot, so it stays sharp at every width and text can be 13–14 px.
6. **Only two dark bands.** One dark product walkthrough in the middle and the closing CTA + footer at the end. Everything else is light, so the dark moments carry weight.
7. **FAQ accordion.** A single white card, centred, about 680 px wide, rows split by hairlines, a "+" that becomes "−", the open answer in muted 15 px text, and a "Still have questions?" line below.

What v3 takes: the canvas + rails + "+" marks, the hero card, the nav-to-floating-bar change, the label + heading pattern, product UI as HTML cards with a header row, the FAQ card. What v3 does differently: one dark band, not two (the closing CTA card); Bridge keeps its own voice: Instrument Serif h1 with the italic rust "recap", the warm canvas, the rust accent and the illustrated cast.

## Visual system

| Role | Value |
|---|---|
| Canvas | `#FBFAF8` |
| Surface (cards) | `#FFFFFF` |
| Hairline | `#ECEAE6` |
| Ink | `#17171A` |
| Muted | `#6B6A70` (5.13:1 on canvas, 5.36:1 on white; measured by `frontend/scripts/contrast.mjs`) |
| Accent (text, CTA fill) | `#B4440A` (5.57:1 white on rust, 5.34:1 rust on canvas) |
| Room colours | only inside the call window |

- Rails at the 1200 px container edges, full page height; a hairline divider between sections with "+" marks where it meets the rails.
- h1 Instrument Serif 84 px (desktop) to 48 px (phone), italic rust "recap". h2 Geist 500, 36 px, -0.02em, centred, with a 13 px muted label above. Body Geist 17 px. Product UI text 13–14 px, never smaller.
- Cards: white, radius 16, 1 px hairline, `0 1px 2px rgb(0 0 0/4%), 0 12px 32px -16px rgb(0 0 0/12%)`; header row 44 px with a 13 px label.
- Motion: reveal is opacity 0→1 and y 12→0 over 500 ms `cubic-bezier(0.16,1,0.3,1)`, 50 ms stagger, once. Hover lift 2 px with a deeper shadow, 200 ms. Nav change 250 ms. No pinned or scroll-scrubbed sections. `prefers-reduced-motion` shows the final state.
- The landing page is light only (`color-scheme: light` on the page root); the app keeps its light and dark themes.

## Structure (7 sections)

1. **Nav**: logo; How it works, Features, FAQ; Sign in; "Try the demo". Floating rounded bar after 24 px of scroll.
2. **Hero card**: h1, one sub line, "Try the live demo", "Start a meeting →", "No account needed". One composition: a light-chrome app window holding the dark 2×2 call with the cast; the white recap card overlaps its lower right edge. An 8 s DOM loop: the speaking ring moves, End is pressed, the grid dims, the recap card rises and writes in, holds, resets.
3. **Benefit strip**: three hairline cells (Join from a link · Notes the second it ends · Private by design).
4. **How it works**: three cards, each a different small vignette (lobby device check, invite link + joined list, mini recap with a checked action item). No call grid.
5. **Features**: one large card with the full recap rendered in HTML and a working Copy as Markdown + toast; a 2×2 of small fragments that animate on hover or focus (chat, host controls with confirm, screen share, reconnecting); a meeting-history card.
6. **FAQ**: five questions in an accordion with a smooth height animation.
7. **Final CTA**: the page's only dark band, a rounded dark card inside the rails; then the footer on the light canvas.

Each visual idea appears once: the 2×2 call grid is drawn only in the hero.

## Recap output

`backend/src/utils/meetingSummary.js` (and its browser copy for the demo, kept identical by a parity test) now produces:

- `conclusion`: one sentence from the outcome lines and the top two topics, e.g. "Agreed to ship the release on Thursday; the onboarding fix merges before lunch." Never a list of attendees.
- `keyPoints`: `{ speaker, text }` statements without the "Name:" prefix (the UI shows the speaker as an avatar chip). Older string key points still render.
- `actionItems`: `{ owner, task, due? }` from ownership and commitment lines (owns, I'll, will, next step, deadline, by &lt;day&gt;).
- The recap shows the host's display name, never the internal handle.

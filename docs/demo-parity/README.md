# Demo parity: screenshots and QA

Before (`before-*`) is `master` at e9c91d4; after (`after-*`) is `fix/demo-parity`. Every shot is taken at 1440×900 and 390×844 (device scale 2) by the same Playwright script, so each pair matches.

| Change | Files |
|---|---|
| 1. Demo room uses the illustrated cast | `*-demo-join-*`, `*-demo-mid-*` |
| 2. Scripted stand-up, End hint, real recap date | `*-demo-late-*` (hint beside End), `*-demo-recap-*` (full recap page) |
| 3. Mobile hero chips and recap card | `*-hero-recap-390` |
| 4. Hero loop order | `*-hero-firstpaint-*` (bright live call, Maya speaking), `*-hero-ended-*` (the 1.3 s dim), `*-hero-recap-*` |
| 5. Avatar stacks | `*-stacks-history-*`, `*-stacks-team-*` |
| 6. QA flow recordings | `qa-flow-1440.mp4`, `qa-flow-390.mp4` |

## Measurements

Mobile hero, checked in the DOM at 320, 360, 390, 430, 600 and 768 px:

- Name chips: first name only, 12 px, and none of them overlaps the face's bounding box on any tile. At 360 px and below the chip docks into the tile's corner as a tab.
- Recap card: covers 12% of the grid, which is 24–25% of each bottom tile. The top row is never touched, and every chin stays 2–9 px above the card.

Hero loop, as sampled from `data-phase` in the browser:

| ms | state |
|---|---|
| 0 | talk, Maya speaking |
| 1300 | talk, Aarav |
| 2600 | talk, Sofia |
| 3700 | End pressed |
| 4000 | ended (dimmed) |
| 5300 | recap (bright, card in focus) |
| 8000 | talk, Maya (reset) |

QA flow: load `/`, click "Try the live demo", click Join, wait for the hint, click End, confirm. The results, at both sizes:

- The clock reads `0:00` at join.
- The hint appears 32.8 s after join at 1440 and 33.1 s at 390.
- There are 4 tiles, and 3 of them show the cast.
- The recap has all 4 action items and the summary "Agreed to launch the pricing page on Friday…".
- The recap's date equals the join time.
- There were 0 console errors.
- Axe found 0 WCAG 2.1 AA violations on `/` and in the room.

The landing page sends one background `GET /api/v1/health` to wake the hosted API. This sandbox has no backend, so the QA run answered that request with a 200; without that stub, it logs a "connection refused" error. The demo itself makes no API calls.

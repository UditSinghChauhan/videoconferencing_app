# Landing revamp: "Faces in, notes out."

Branch `feat/landing-revamp`, started 2026-11-01. This file records the point of view, the references and
what was borrowed from each, and what was left out. DESIGN.md holds the rules that came out of it.

## The diagnosis

The previous landing page was correct and calm, and nobody remembered it. Checked against the live site
(`docs/screenshots/revamp/before/`):

- **No faces.** `capture-landing.mjs` turned every camera off, because Chrome's fake camera is a test
  pattern. A video-calling product showed four initials on grey.
- **An empty first five seconds.** The hero loop opened on a mostly cream recap page; the call itself was
  over before the eye landed.
- **Unreadable product UI.** Room labels rendered at 9 to 11 px inside the frame at 1440 px, and smaller on
  a phone.
- **A real product bug on the page.** The recap's Topics chips read "owns", "copy", "agenda", "checklist":
  the summariser promoted verbs and chat labels to topics.
- **Defects.** The nav stayed light over the black Engineering section; the "Tested end to end" grid put
  descriptions in a third column that did not line up with its checks; walkthrough steps sat 300 to 400 px
  apart and the pane swapped pictures with no continuity.
- **Rules that made everything calm and nothing memorable:** no shadows at rest, no decorative icons, no
  scroll library.

## Point of view

Bridge has exactly one idea worth five seconds: **a live call becomes a written recap the moment the host
presses End.** So the page is built around that transformation and nothing else gets equal billing.

1. **The first frame is people.** Four faces, a speaking ring that moves, then the End button, then notes.
   Not a recap page waiting for you to understand it.
2. **The product is the hero, at hero scale.** The frame grows to 1200 px and the UI inside is legible.
3. **One signature chapter.** A pinned, scroll-scrubbed stage where the call folds into the recap, built
   from real DOM so text is crisp and can be read at any zoom.
4. **Every later section moves the product a little.** Bento tiles are tiny loops of real components,
   the architecture figure carries packets, the test list runs.
5. **Honesty is part of the craft.** The faces are an illustrated cast, said so in the caption. Numbers
   are measured or counted in code. The summariser was fixed, not the screenshot.

### Why an illustrated cast

Nobody was recorded, and realistic generated faces in a product demo read as deceptive and uncanny,
which is the opposite of what a portfolio piece should signal. A designed cast is honest, scales to any
size as SVG, and can be animated precisely (the mouth moves only while that person speaks, so the
speaking ring has something to agree with). The cast is fed into the running app as a fake camera and
microphone, so the hero loop is still a recording of the real product.

## References: the technique borrowed from each

Each site was opened in Playwright at 1440 × 900 and scrolled. Techniques only; no looks or assets.

- **Apple** (apple.com; the FaceTime URL now redirects to a support article, so the product pages on
  apple.com were used): one sentence per screen, and a device that scales and settles as it reaches the
  centre of the viewport. Borrowed for the hero frame's 0.92 → 1 settle and the four one-line beats of
  the signature chapter.
- **heyclicky**: video tiles *are* the hero; real people in small windows make the product feel inhabited
  before you read a word. Borrowed: faces in the first frame, framed as tiles, not as portraits.
- **ToDesktop**: a single centred app window as the stage, with the headline above it. Kept from the
  previous version and made larger (1200 px) with soft depth.
- **Skydive**: warm, light ground with lots of space and a cast of characters arranged as tiles. Borrowed:
  generous spacing and the confidence to use illustrated people instead of stock photography.
- **Stripe Press**: editorial serif confidence; type carries the page, and a thin scroll index at the side
  tells you where you are. Borrowed: serif titles on the decision cards and the "01 / 03" progress line.
- **Rauno Freiberg** and **Josh Puckett**: the bar for micro-detail. Small, exact interactions (hover lift,
  focus rings that match the surface, motion that ends cleanly). Borrowed: bento lift on hover, 150 ms
  controls, nothing that bounces.
- **Shopify**: pacing. Big product moments are separated by quiet text bands so each one lands. Borrowed:
  the rhythm hero → facts → chapter → walkthrough → bento, alternating large stages with short text.
- **vibrant.design bento and how-it-works collections**: bento grids work when tiles differ in size and each
  tile shows one thing happening; how-it-works sections work when steps share one continuous visual.
  Borrowed: the 12-column 2 large + 2 small bento, and the walkthrough as one camera moving over one capture.

## What is still banned

Blob gradients, glassmorphism, fake logos or testimonials, invented metrics, scroll-jacking, stock or
generated photographs of people.

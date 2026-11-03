# Landing captures: the illustrated cast

The landing page's recordings are taken from the running app. Faces come from an
original illustrated cast (Maya Patel, Aarav Mehta, Sofia Rossi, Jordan Lee), fed
into Chrome as each participant's fake camera and microphone. No real people are
recorded, and no stock or generated photographs are used.

`capture/cast/` is git-ignored: the clips are about 280 MB each and are rebuilt from
code in two minutes.

## 1. Run the app against a scratch database

```bash
cd backend && npm run db:memory
```

```bash
cd backend && PORT=8100 MONGODB_URI=mongodb://127.0.0.1:27017/bridge-capture JWT_SECRET=dev JWT_REFRESH_SECRET=dev AUTH_RATE_LIMIT_MAX=1000 npm start
```

```bash
cd frontend && npm run start:e2e
```

## 2. Render the cast into camera and microphone files

```bash
cd frontend && node scripts/render-cast.mjs
```

For each person this opens `/__cast?person=<id>` (a development-only route that shows
the animated SVG cast member in their room), records exactly one 12 s loop with
Chrome's screencast and writes:

- `capture/cast/<id>.y4m`: 960 × 540, 30 fps, 12 s (the format Chrome's
  `--use-file-for-fake-video-capture` reads). 960 × 540 is sharper than any tile it
  fills and keeps twelve WebRTC encoders affordable while capturing.
- `capture/cast/<id>.wav`: 48 kHz mono, 12 s. Silence, plus a speech-like signal
  while that person speaks in `frontend/src/features/landing/cast/timeline.ts`, so
  Bridge's real speaking detector moves the ring onto the face whose mouth is moving.

To convert a clip by hand (for example from another source), the equivalent ffmpeg
call is:

```bash
ffmpeg -i input.mp4 -t 12 -vf "scale=960:540,fps=30" -pix_fmt yuv420p capture/cast/maya.y4m
```

## 3. Capture

```bash
cd frontend && node scripts/capture-landing.mjs
```

One Chromium per participant, each launched with
`--use-file-for-fake-video-capture=capture/cast/<id>.y4m` and
`--use-file-for-fake-audio-capture=capture/cast/<id>.wav`, cameras on. Guests join on
the cast loop's beat so people speak in turn. If any clip is missing the script stops
and says so; it never falls back to cameras off.

`CAPTURE_ONLY=stills|hero|phone` reruns one part. Output goes to
`frontend/public/landing/`.

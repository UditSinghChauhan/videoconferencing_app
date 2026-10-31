# Architecture

This document explains how Bridge works and why it is built this way. It is written for engineers reviewing the code. Product and visual decisions are in [DESIGN.md](DESIGN.md).

## 1. System overview

```text
 Browser A  ◀──────── WebRTC media, peer to peer ────────▶  Browser B
     │                                                         │
     └──────── REST (HTTPS) + Socket.IO signalling ────────────┘
                                │
                     Node.js · Express · Socket.IO
                                │
                             MongoDB
```

| Concern | Owner |
|---|---|
| Identity, sessions, roles, meeting state, recap | API (REST) + MongoDB |
| Presence, chat, media state, signalling relay | Socket.IO, scoped to a meeting room |
| Audio and video | Browsers, directly over WebRTC |

The server never touches media. That keeps hosting cheap and the server simple. The trade-off is covered in [§ 9](#9-scaling-and-what-id-do-next).

## 2. Codebase map

```text
backend/src
  createApp.js             Express + HTTP + Socket.IO wiring (no listen); used by app.js and tests
  app.js                   entry point: MongoDB connect, listen, graceful shutdown
  controllers/             REST handlers; socketManager.js is the realtime server
  services/                auth.service.js, meeting.service.js (all business rules)
  middlewares/             verifyAuthToken, validate(zod), rate limits, error handler
  utils/                   tokens, CORS, meetingCode, meetingSummary, logger

frontend/src
  lib/                     api.ts (single HTTP client), session.ts, types, formatters
  auth/                    AuthProvider, RequireAuth
  features/room/
    peerMesh.ts            WebRTC mesh, framework-free
    useLocalMedia.ts       mic / camera / screen tracks
    useMeetingConnection.ts  socket session as a reducer-driven state machine
    RoomView, Lobby, VideoStage, VideoTile, ControlBar, SidePanel
  features/meetings/       history list, recap Markdown export
  pages/                   one lazy-loaded component per route
  components/              design-system primitives
```

Rule of thumb: **business rules live in services, and pages only compose.** `RoomView` and `Lobby` are presentational. The real meeting (`RoomPage`) and the public demo (`DemoPage`) both render them, so the demo can never drift from the product.

## 3. Authentication and sessions

**Sign-in.** `POST /users/login` verifies the bcrypt hash and creates a server-side session in the user's `sessions` array. The session stores a session id, the SHA-256 hashes of the refresh token and the CSRF token, the user agent, the IP and an expiry.

The response carries:
- a 15-minute **access JWT** containing `userId` and `sessionId`
- a **CSRF token**
- a 7-day **refresh JWT** in an `httpOnly` cookie scoped to `/api/v1/users`

**Every request.** `verifyAuthToken` verifies the JWT, then confirms the session still exists and has not expired. That means signing out, or signing out of every device, revokes access tokens immediately; it doesn't wait for them to expire.

**Refresh.** `POST /users/refresh` requires the cookie and the `X-CSRF-Token` header. It rotates both tokens. Presenting an old refresh token is treated as replay and rejected.

The client shares **one in-flight refresh** across all callers (HTTP interceptors and socket reconnects). Without that, two parallel 401s would each try to refresh, the second would look like replay, and the user would be signed out.

**Cross-site cookie.** In production the web app and the API are on different `onrender.com` hosts. `onrender.com` is a public suffix, so they are different sites. The refresh cookie is therefore `SameSite=None; Secure` by default. CSRF is still enforced by the header token, which a third-party page cannot read. `COOKIE_SAME_SITE=strict` is available for same-site deployments.

**Sockets.** The handshake sends the access token (`auth` is a function, so every reconnect reads the latest token). The server applies the same JWT and session checks. An expired token produces `TOKEN_EXPIRED`; the client refreshes and reconnects.

## 4. Meeting lifecycle

| Step | API | Rules |
|---|---|---|
| Create | `POST /meetings` (body optional) | Without a code, the server generates `xxx-xxxx-xxx` from a 23-letter alphabet with no look-alike letters. The unique index, not a read-then-write check, guarantees no collisions; a collision is retried. |
| Join | `POST /meetings/:id/join` | Unknown codes return **404**; the client never creates a meeting by accident. Ended meetings return 400 `MEETING_ENDED`. The host role is derived from `hostId`, so it survives rejoining. |
| Leave | `POST /meetings/:id/leave` | Participants only. The host ends the meeting instead. |
| Remove | `POST /meetings/:id/remove-participant` | Host only. The removed user's sockets get `meeting:removed` and are disconnected. |
| End | `POST /meetings/:id/end` | Host only. Closes every participant, generates the recap, emits `meeting:ended`, then disconnects the room. |
| Recap | `GET /meetings/:id/summary` | Anyone who was ever a participant. Returns metadata, the recap and the chat transcript. Others get 403. |

Every permission is checked in `meeting.service.js`. The UI hides controls for convenience only.

## 5. Realtime: Socket.IO

Each meeting is a Socket.IO room named `meeting:<id>`.

**Client to server**

| Event | Server behaviour |
|---|---|
| `join-call(meetingId)` | Validates the id, checks the user is an active participant, replaces any older socket of the same user (flagged first, so its disconnect does not count as leaving), joins the room, replays recent chat. |
| `signal(toId, payload)` | Relayed **only if the target socket is in the sender's meeting**, and capped at 64 KB. |
| `media:state({audio, video, screen})` | Sanitised to booleans, stored on the socket and broadcast to the room. |
| `chat-message(text)` | Trimmed and capped at 2,000 characters. Rejected when the host disabled chat. Sent with the display name, an id and a timestamp. Persisted with an atomic `$push`. |

**Server to client:** `meeting:joined`, `user-joined`, `user-left`, `signal`, `media:state`, `chat-message`, `meeting:participants-updated`, `meeting:settings-updated`, `meeting:removed`, `meeting:ended`, and `meeting:error` (with a `code` such as `REPLACED_BY_NEW_CONNECTION` or `CHAT_DISABLED`).

**Leaving vs. disconnecting.** On disconnect, a user is marked as left only if this was their **last** socket in the room and it was not replaced by a newer tab. Hosts are never marked as left by a disconnect, so a host whose network drops does not end the meeting.

**Client state.** `useMeetingConnection` is a reducer with explicit statuses: `connecting`, `connected`, `reconnecting`, `ended`, `removed`, `replaced` and `failed`. Terminal statuses are sticky. Two ordering details matter:
- `media:state` can arrive before `user-joined` for the same socket. The reducer keeps it on a placeholder, and a later directory snapshot does not overwrite live state.
- After a reconnect, the socket id changes. The client calls REST `join` again (the server marked the old socket as left) and only then emits `join-call`.

## 6. Media: the WebRTC mesh

`PeerMesh` (`features/room/peerMesh.ts`) has no React dependency.

- **Who offers.** The newcomer connects to everyone already in the room; existing members wait for the offer. That halves signalling on join.
- **Perfect negotiation.** Each pair has exactly one *polite* peer (by socket id order). Offer collisions resolve by rollback, so renegotiation and ICE restarts cannot deadlock.
- **Fixed transceivers.** Every connection is created with one audio and one video transceiver in `sendrecv`, even with no device. Mute (`track.enabled`), camera off (stop the track, `replaceTrack(null)`) and screen share (replace the video track) never renegotiate. The answering side adopts the offered transceivers instead of adding new ones.
- **Remote streams.** Built by the client from `ontrack`, with a new `MediaStream` identity per change. Script-side `addTrack` fires no `addtrack` event, so identity is how React learns the stream changed.
- **What is shown.** A tile shows video only when the peer reports video in `media:state` **and** the track is unmuted. That second check also covers older API versions that don't send `media:state`.
- **Failures.** On `failed` the connection calls `restartIce()`. ICE servers are STUN by default; `VITE_ICE_SERVERS` adds TURN without a code change.

Speaking detection uses one shared `AudioContext` with an `AnalyserNode` per track, sampled about 8 times a second with a short hold, rather than every animation frame.

## 7. Recap generation

`utils/meetingSummary.js` is deterministic and runs in about a millisecond when the host ends the meeting.

- **Key points:** chat lines scored by length, sentence completeness and decision words (*decide, deadline, ship, must, next*). The top three are kept.
- **What happened:** the last three non-chat activity entries (joins, removals, end).
- **Topics:** keyword frequency after removing stop words and conversational filler ("sounds good", "thanks").
- **Conclusion:** a sentence assembled from topics and participants.

It is honest about what it is: there is no audio transcription and no LLM. The schema separates the recap from activity logs, so an AI summariser could replace the generator without touching storage or the UI.

## 8. Data model

**User:** `name`, `username` (unique), `password` (bcrypt), and `sessions[]` (`sessionId`, refresh and CSRF hashes, user agent, IP, `expiresAt`). Expired sessions are pruned on write.

**Meeting:**
- `meetingId` (unique), `hostId`, `hostUsername`, `status` (`active` or `ended`), `settings`, `endedAt`
- `participants[]`: `userId`, `username`, `name`, `role`, `joinedAt`, `leftAt`, `removedAt`
- `activityLogs[]`: type, user, content, time
- `summary`
- Index `{ "participants.userId": 1, updatedAt: -1 }` serves history. History queries leave out `activityLogs` and return at most 50 meetings.

Participants and logs are embedded because they are always read with their meeting and are bounded by meeting size. A long-running public room would eventually hit the 16 MB document limit. The fix would be moving activity logs into their own collection.

## 9. Scaling and what I'd do next

| Limit | Why | Next step |
|---|---|---|
| About 6 people per room | In a mesh, each person uploads N−1 streams | An SFU (LiveKit or mediasoup) behind the same signalling API; the client already isolates media in `PeerMesh` |
| One API instance | Socket rooms and the chat replay buffer are in memory, and `signal` relays through a local socket lookup | The Socket.IO Redis adapter, plus emitting `signal` through the adapter |
| Strict NATs | STUN only by default | Managed TURN (coturn or a provider) via `VITE_ICE_SERVERS` |
| Recap quality | Rule-based | An optional LLM summariser behind the same `summary` schema, plus opt-in audio transcription |
| Observability | Structured JSON logs only | Request ids, OpenTelemetry traces, and call-quality stats from `getStats()` |

## 10. Testing strategy

| Layer | Tooling | What it proves |
|---|---|---|
| API unit | `node:test` | Tokens, validators, cookie policy, meeting codes, recap generation |
| API integration | `node:test`, supertest, real Socket.IO clients, mongodb-memory-server | Signal isolation across rooms, the multi-tab roster bug, chat policy, media-state relay, generated codes, 404 on unknown codes |
| Web unit | Vitest | Grid layout maths, meeting-code parsing, formatters, the connection reducer (including the event-ordering race), recap export |
| End to end | Playwright with fake camera and mic | Two browsers in a real WebRTC call: chat, mute, leave and rejoin, removal, end and recap, access control, the demo |
| Accessibility | axe-core, WCAG 2.1 AA | Public pages and the room; a keyboard-only sign-in check |

The bug fixes in the API were written test-first: each integration test failed on the old code before the fix.

## 11. Design decisions

- **Socket.IO over raw WebSockets.** Rooms, acknowledgements, reconnection with backoff and a polling fallback for restrictive proxies. These are table stakes for signalling, and writing them by hand adds risk without adding value.
- **Server-tracked sessions over stateless JWTs alone.** Revocation (sign out everywhere, removing a compromised session) matters more here than saving one indexed lookup per request.
- **Vite and strict TypeScript, no component library.** The room's state machine and the WebRTC code are where bugs hide, and types pay for themselves there. Dropping MUI cut the initial bundle and let the design system express the product instead of the library.
- **One presentational room for the demo and the product.** The old demo was a hand-maintained copy of the room that had already drifted. Now the demo exercises the same components the e2e suite tests.

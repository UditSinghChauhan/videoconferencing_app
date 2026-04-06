# Architecture

## 1. System Overview

Bridge is a full-stack real-time video collaboration platform built around a clear separation of concerns:

- A React frontend handles authentication, meeting flows, room UI, history, and summary views.
- A Node.js + Express backend exposes REST APIs for authentication, meeting lifecycle management, history, and summaries.
- MongoDB persists users, active sessions, meetings, participants, activity logs, and generated summaries.
- Socket.IO provides live synchronization for participant presence, chat, room state changes, removals, and meeting termination.
- WebRTC is used in the browser for peer-to-peer media exchange once participants are inside a room.

At a high level, the system works like this:

1. A user authenticates through the backend and receives an access token plus a refresh-token cookie.
2. The frontend stores the access token and uses it for API and socket authentication.
3. Users create or join meetings through REST endpoints.
4. Once in a room, Socket.IO keeps participant state and chat synchronized in real time.
5. When the host ends the meeting, the backend generates a structured summary from activity logs and stores it in MongoDB.
6. Users are redirected to the persisted summary view from the history page.

This architecture balances responsiveness, backend enforcement, and maintainability. Real-time events are pushed through sockets, while business rules and persistent state remain controlled by the backend.

## 2. Architecture Diagram (Text-Based)

```text
                        +----------------------+
                        |      React App       |
                        |  Auth / Rooms / UI   |
                        +----------+-----------+
                                   |
                    REST APIs       |        WebSocket
                                   | 
                                   v
                    +--------------+---------------+
                    |       Node.js + Express      |
                    |  Auth / Meetings / Summary   |
                    +--------------+---------------+
                                   |
                                   |
                                   v
                        +----------------------+
                        |       MongoDB        |
                        | Users / Meetings     |
                        | Sessions / Logs      |
                        +----------------------+
```

```text
Client A <-------> Socket.IO Server <-------> Client B
   |                    |   ^
   |                    |   |
   +---- REST APIs -----+   +---- Meeting state updates
```

```text
Client -> /login -> Access Token + Refresh Cookie
Client -> /meetings/:id/join -> Meeting State
Client <-> Socket.IO room(meetingId) -> Live sync
Host -> /meetings/:id/end -> Summary generation -> MongoDB
Client -> /meetings/:id/summary -> Persisted summary
```

## 3. Authentication Flow

### Login Flow

1. The user submits username and password to `POST /api/v1/users/login`.
2. The backend validates credentials against the `User` collection.
3. On success, the backend creates a server-tracked session with:
   - `sessionId`
   - hashed refresh token
   - hashed CSRF token
   - user-agent and IP metadata
   - expiration timestamp
4. The backend returns:
   - a short-lived JWT access token
   - a CSRF token
   - user details
5. The refresh token is stored in an HTTP-only cookie scoped to the auth routes.

### Session Validation

Every protected API request uses the Bearer access token. The backend middleware:

- verifies the JWT signature and expiry
- loads the user from MongoDB
- validates that the referenced session still exists and is active

This means token validity depends not only on signature but also on live session state.

### Token Refresh Mechanism

When an access token expires:

1. The frontend detects `401 TOKEN_EXPIRED`.
2. It calls `POST /api/v1/users/refresh`.
3. The backend validates:
   - refresh token cookie
   - refresh token signature
   - session hash match
   - CSRF token header
4. The backend rotates the refresh token and CSRF token, updates the same session, and returns a new access token.

This provides a more secure long-lived session model than relying on long-expiry access tokens alone.

### Security Aspects

- Access tokens are short-lived JWTs.
- Refresh tokens are stored in HTTP-only cookies.
- CSRF is enforced for refresh and logout operations.
- Refresh tokens are hashed before persistence.
- Sessions can be invalidated per user or across all devices with logout-all.
- Socket authentication also checks that the underlying session is still active.

## 4. Real-Time Communication Flow (Socket.IO)

### Client Connection

When a user enters a meeting room:

1. The frontend creates a Socket.IO connection.
2. The access token is sent in the socket auth handshake.
3. The backend verifies the token and session before allowing the socket to connect.

### Room-Based Model

Each meeting maps to a Socket.IO room:

- Room key: `meeting:${meetingId}`
- All real-time events for a meeting are scoped to that room

This prevents cross-meeting event leakage and keeps synchronization isolated.

### Core Events

The system uses a focused set of events:

- `join-call`
- `meeting:joined`
- `meeting:participants-updated`
- `chat-message`
- `user-joined`
- `user-left`
- `meeting:removed`
- `meeting:ended`
- `meeting:settings-updated`
- `meeting:error`
- `signal` for WebRTC negotiation

### Synchronization Model

Socket events do not replace backend state. Instead:

- the backend remains the source of truth for meetings and participants
- sockets broadcast state changes after backend mutations
- clients re-render based on server-emitted participant and meeting state

This reduces drift between real-time UI and persisted meeting data.

## 5. Meeting Lifecycle

### Create Meeting

- A user creates a meeting with `POST /api/v1/meetings`
- The backend creates a `Meeting` document
- The creator is recorded as the host
- Initial activity logs are created

### Join Meeting

- A user joins via `POST /api/v1/meetings/:meetingId/join`
- If the meeting exists and is active, the backend adds or restores the participant
- The frontend then opens a socket connection and joins the corresponding room

### Role Assignment

Roles are assigned by the backend:

- creator => `host`
- other users => `participant`

Role information is returned as part of meeting state and used by the UI, but it is enforced server-side.

### Meeting Actions

Supported actions include:

- join meeting
- leave meeting
- remove participant
- update meeting settings
- end meeting

All of these are reflected both in persistent state and in socket-driven updates to connected clients.

## 6. Role-Based Access Control

Bridge uses backend-enforced RBAC for meeting actions.

### Host Permissions

The host can:

- end the meeting
- remove participants
- update meeting settings

### Participant Permissions

Participants can:

- join active meetings
- leave active meetings
- chat and collaborate inside the room

Participants cannot:

- end the meeting
- remove the host
- remove other participants
- change host-only settings

### Enforcement Model

RBAC is enforced in service-layer logic, not just hidden in the frontend.

This matters because:

- UI controls can be bypassed
- direct API calls must still be blocked
- socket-connected users must remain constrained by persisted meeting roles

This is one of the stronger production-oriented design choices in the system.

## 7. Meeting Summary System

### Activity Log Collection

Each meeting stores structured activity logs, including:

- join events
- leave events
- participant removal events
- meeting settings changes
- chat messages
- meeting end event

These logs are appended during the meeting lifecycle and become the source material for the summary.

### Summary Generation

Summary generation is rule-based and internal to the backend. It does not depend on an external AI API.

The summary utility:

- extracts chat messages
- identifies candidate key points using heuristic scoring
- derives top keywords by simple text frequency
- captures recent non-chat highlights
- builds a conclusion from participants and dominant keywords

This keeps the summary flow deterministic, low-cost, and easy to operate.

### Storage and Retrieval

When the host ends a meeting:

1. the meeting is marked as ended
2. a summary object is generated
3. the summary is stored inside the meeting document

Users later retrieve it through:

- meeting history
- direct summary endpoint `GET /api/v1/meetings/:meetingId/summary`

## 8. Data Layer (MongoDB)

### Key Collections

#### Users

The `User` model stores:

- profile identity (`name`, `username`)
- hashed password
- active sessions

Each session contains:

- `sessionId`
- hashed refresh token
- hashed CSRF token
- metadata (user-agent, IP)
- expiration

#### Meetings

The `Meeting` model stores:

- `meetingId`
- host identity
- participants
- status (`active` or `ended`)
- meeting settings
- activity logs
- summary

### Relationship Model

```text
User
  └── sessions[]

Meeting
  ├── hostId -> User
  ├── participants[]
  │     └── userId -> User
  ├── activityLogs[]
  └── summary
```

This denormalized structure is appropriate for the current scope because meeting reads often need participant state, logs, and summary together.

## 9. Testing Strategy

Bridge uses Playwright for end-to-end verification at the browser level.

### What Is Tested

The E2E suite covers:

- registration and login
- session persistence after refresh
- meeting creation and join flow
- real-time chat synchronization
- leave and rejoin behavior
- role-restricted actions returning `403`
- host participant removal
- meeting end and summary redirect
- summary persistence after reload
- unauthorized summary access rejection

### Why This Matters

Playwright validates the full integrated system:

- frontend behavior
- backend APIs
- auth/session state
- socket synchronization
- persisted meeting and summary data

This is stronger than isolated unit testing for a real-time system because many failures only appear when multiple layers interact.

## 10. Scalability & Future Improvements

### WebRTC Scaling

The current design is appropriate for small, direct peer-to-peer sessions. For larger rooms, a future SFU architecture would improve scalability and media reliability.

### Socket.IO Horizontal Scaling

To scale beyond a single process:

- Socket.IO would need a distributed adapter such as Redis
- room membership and socket broadcasts would need cross-instance coordination

### AI-Based Summary Integration

The current rule-based summary engine is efficient and self-contained. A future LLM-backed summarization layer could improve summary quality, but should be introduced behind a stable summary interface so the rest of the system remains unchanged.

## 11. Design Decisions

### Why Socket.IO

Socket.IO was a strong fit because it provides:

- reliable event-based communication
- room semantics
- reconnection support
- a straightforward frontend/backend developer experience

For this product, it reduces complexity compared to building a raw WebSocket orchestration layer manually.

### Why JWT + Refresh Tokens

This architecture combines stateless request auth with stateful session control:

- access tokens are lightweight and fast for APIs and sockets
- refresh tokens allow secure session continuity
- server-side sessions preserve the ability to invalidate devices and rotate tokens

This is a practical middle ground between pure stateless JWT auth and fully server-bound sessions.

### Why Service-Based Backend Structure

The backend is organized so that:

- routes define endpoints
- controllers handle request/response orchestration
- services contain business rules
- models define persistence shape
- utilities handle reusable logic such as tokens and summaries

This separation makes the codebase easier to reason about, test, and evolve as the product grows.

## Closing Note

Bridge demonstrates production-oriented thinking in a compact system:

- backend-enforced permissions
- secure session lifecycle handling
- real-time state synchronization
- persistent activity-based summaries
- browser-level E2E validation

For recruiters and interviewers, the strongest takeaway is that the project is not just a UI demo. It is a complete system with clear boundaries, real-time coordination, persistent domain modeling, and architecture choices that scale naturally into more advanced collaboration features.

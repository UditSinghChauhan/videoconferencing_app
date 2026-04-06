# Bridge

Bridge is a real-time video collaboration platform built for fast meetings, secure authentication, live participant sync, and persistent meeting insights. It combines a React frontend, an Express + MongoDB backend, Socket.IO for live coordination, and browser-level Playwright coverage for the full meeting lifecycle.

## Live Links

- App: [bridgefrontend.onrender.com](https://bridgefrontend.onrender.com)
- Repository: [github.com/UditSinghChauhan/videoconferencing_app](https://github.com/UditSinghChauhan/videoconferencing_app)

## Key Features

### Secure Authentication

- JWT access tokens with refresh token rotation
- Refresh token stored in an HTTP-only cookie
- CSRF protection for refresh/logout flows
- Multi-session handling with logout-all support
- Protected routes with session persistence after refresh

### Real-Time Collaboration

- Socket.IO-based live meeting synchronization
- Instant join, leave, remove, and end-meeting events
- Real-time chat inside the room
- Lobby flow before entering a meeting
- WebRTC-based media sharing with camera, mic, and screen-share controls

### Role-Based Meeting Control

- Host and participant roles are assigned server-side
- Only the host can end a meeting
- Only the host can remove participants
- Permissions are enforced in backend APIs, not just hidden in the UI

### Smart Meeting Summaries

- Meeting summaries are generated automatically when the host ends a meeting
- Summaries include:
  - Key points
  - Highlights
  - Keywords
  - Participants involved
  - Conclusion
- Summaries are stored in MongoDB and remain available from history

## Architecture Overview

Frontend:

- React with Context API for auth and meeting state
- React Router for protected navigation
- Material UI plus custom glassmorphism styling
- Socket.IO client for live room updates

Backend:

- Node.js + Express
- MongoDB with Mongoose
- JWT access/refresh token flow
- Zod validation and centralized error handling
- Rate limiting for auth and meeting endpoints

Real-Time Layer:

- Socket.IO rooms scoped by `meetingId`
- Authenticated socket connections using access tokens
- Event-driven participant and chat synchronization

## How It Works

1. A user registers or logs in.
2. The backend creates a tracked session and returns an access token plus refresh-token cookie.
3. The user joins or creates a meeting using a room code.
4. A socket connection is established with authentication.
5. Join, leave, chat, removal, and end-meeting events sync across participants in real time.
6. When the host ends the meeting, a summary is generated and users are redirected to the summary view.

## Testing

Bridge now includes both API-level certification work and browser-level E2E validation.

- Playwright end-to-end coverage includes:
  - Register and login flow
  - Session persistence after refresh
  - Meeting create and join flow
  - Real-time chat and leave/rejoin flow
  - Host vs participant permission enforcement
  - Host participant removal flow
  - Meeting end and summary redirect
  - Summary persistence
  - Unauthorized summary access returning `403`

Run E2E tests from `frontend/`:

```bash
npm run test:e2e
```

## Tech Stack

- Frontend: React, React Router, Material UI, custom CSS
- Backend: Node.js, Express
- Database: MongoDB
- Real-time: Socket.IO, WebRTC
- Validation: Zod
- Testing: Playwright

## Project Structure

```text
backend/
  src/
    controllers/
    middlewares/
    models/
    routes/
    services/
    utils/

frontend/
  src/
    contexts/
    pages/
    styles/
    utils/
  tests/
    e2e/
```

## Local Setup

### Prerequisites

- Node.js 18+
- npm
- MongoDB connection string

### Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=8000
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=your_access_token_secret
JWT_REFRESH_SECRET=your_refresh_token_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_REFRESH_COOKIE_MAX_AGE_MS=604800000
```

Start the backend:

```bash
npm run dev
```

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
REACT_APP_ENV=development
REACT_APP_BACKEND_URL=http://localhost:8000
```

Start the frontend:

```bash
npm start
```

## Core API Routes

Authentication:

- `POST /api/v1/users/register`
- `POST /api/v1/users/login`
- `POST /api/v1/users/refresh`
- `POST /api/v1/users/logout`
- `POST /api/v1/users/logout-all`
- `GET /api/v1/users/me`

Meetings:

- `POST /api/v1/meetings`
- `GET /api/v1/meetings`
- `GET /api/v1/meetings/:meetingId`
- `GET /api/v1/meetings/:meetingId/summary`
- `POST /api/v1/meetings/:meetingId/join`
- `POST /api/v1/meetings/:meetingId/leave`
- `POST /api/v1/meetings/:meetingId/end`
- `POST /api/v1/meetings/:meetingId/remove-participant`
- `PATCH /api/v1/meetings/:meetingId/settings`

Health:

- `GET /api/v1/health`

## Challenges Solved

- Secure refresh-token rotation with CSRF validation
- Multi-session auth handling with logout-all invalidation
- Preventing duplicate participant presence during reconnects
- Keeping socket state and database-backed meeting state aligned
- Enforcing host-only actions at the API layer
- Generating structured summaries without depending on external AI services

## Future Improvements

- TURN/SFU support for more reliable large-scale video sessions
- LLM-powered meeting summarization
- Meeting recording and playback
- Team/workspace collaboration features
- Expanded analytics and host controls

## Status

- Production deployed
- End-to-end browser tested
- Ready to iterate and extend

## Author

Udit Singh Chauhan

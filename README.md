# Bridge

Bridge is a deployed video collaboration application for quick room-based meetings. It focuses on fast joining, clean controls, persistent meeting history, and a simple workflow for real-time conversations.

## Live Links

- App: [bridgefrontend.onrender.com](https://bridgefrontend.onrender.com)
- Repository: [github.com/UditSinghChauhan/videoconferencing_app](https://github.com/UditSinghChauhan/videoconferencing_app)

## What It Does

- User registration and login
- Protected dashboard and history routes
- Join meetings with reusable room codes
- Lobby before entering a meeting
- Video, audio, chat, and screen sharing controls
- Persistent meeting history with quick rejoin
- Backend health endpoint for deployment checks

## Why I Built It

I built Bridge to practice the kind of end-to-end product work expected from a full-stack developer: designing frontend flows, building backend APIs, handling real-time communication, and deploying a working application that can actually be used from the browser.

## Stack

- React
- React Router
- Material UI
- Node.js
- Express
- MongoDB with Mongoose
- Socket.IO
- WebRTC

## Key Engineering Areas

### Frontend

- Landing, authentication, dashboard, history, and meeting room flows
- Protected navigation with local session persistence
- Responsive layouts for desktop and mobile
- Error, empty, and loading states for the main user journey

### Backend

- Express API for registration, login, and meeting history
- MongoDB models for users and room activity
- Health check endpoint for runtime verification
- Socket-based signaling layer for room coordination and chat

### Real-Time Collaboration

- Peer-to-peer media exchange with WebRTC
- Socket-driven room join, leave, and messaging events
- Lobby flow before connecting to a room
- Screen sharing and device toggle support

## Project Structure

```text
backend/
  src/
    app.js
    controllers/
    middlewares/
    models/
    routes/

frontend/
  src/
    contexts/
    pages/
    styles/
    utils/
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
TOKEN_EXPIRY_HOURS=24
```

Start the server:

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

Start the client:

```bash
npm start
```

## API Overview

- `POST /api/v1/users/register`
- `POST /api/v1/users/login`
- `GET /api/v1/users/get_all_activity`
- `POST /api/v1/users/add_to_activity`
- `GET /api/v1/health`

## Challenges Solved

- Coordinating real-time room events across multiple users
- Managing peer connection setup and media toggles in the browser
- Preserving a clean user flow between authentication, dashboard, room join, and history
- Keeping the deployed frontend configurable across local and production environments

## Improvements I Would Add Next

- JWT-based auth middleware instead of token lookup in request payloads
- TURN server support for more reliable connections across restrictive networks
- Participant names and richer presence indicators inside the room
- Additional frontend and backend automated tests
- Better room analytics, scheduling, or recordings as advanced extensions

## Author

Udit Singh Chauhan

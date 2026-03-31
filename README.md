# Bridge

Bridge is a full-stack video collaboration platform built with React, Node.js, Express, MongoDB, Socket.IO, and WebRTC. It supports authenticated access, room-based meetings, chat, screen sharing, and persistent meeting history.

This project is designed to demonstrate product thinking as well as implementation skills: real-time communication, protected frontend routes, backend API design, environment-based configuration, and deployment readiness.

## Live Product

- Frontend: add your deployed frontend URL here
- Backend: add your deployed backend URL here

## Why This Project Matters

Bridge was built as a portfolio-quality clone of a modern video meeting platform with a focus on:

- Real-time peer-to-peer communication using WebRTC
- Socket-based room signaling and chat
- Secure user registration and login
- Persistent activity history for authenticated users
- Production-aware deployment and environment configuration

## Core Features

- User registration and login
- Token-based session handling
- Protected routes for dashboard and history
- Join meetings by room code
- Lobby flow before entering a room
- Real-time video and audio communication
- Screen sharing support
- In-room chat messaging
- Meeting history with quick rejoin
- Health check endpoint for backend monitoring

## Tech Stack

### Frontend

- React
- React Router
- Material UI
- Axios
- Socket.IO Client

### Backend

- Node.js
- Express
- MongoDB with Mongoose
- Socket.IO
- bcrypt

### Real-Time Layer

- WebRTC for peer-to-peer media streaming
- Socket.IO for signaling and room events

## Architecture Overview

### Frontend

- `frontend/src/pages/landing.jsx`: landing page and showcase entry point
- `frontend/src/pages/authentication.jsx`: login and registration flow
- `frontend/src/pages/home.jsx`: authenticated dashboard
- `frontend/src/pages/history.jsx`: meeting history and quick rejoin
- `frontend/src/pages/VideoMeet.jsx`: real-time meeting room
- `frontend/src/contexts/AuthContext.jsx`: auth and meeting activity API calls

### Backend

- `backend/src/app.js`: Express app, MongoDB connection, and health endpoint
- `backend/src/routes/users.routes.js`: auth and activity routes
- `backend/src/controllers/user.controller.js`: registration, login, and history logic
- `backend/src/controllers/socketManager.js`: Socket.IO room coordination

## Local Setup

### Prerequisites

- Node.js 18+
- npm
- MongoDB Atlas connection string or local MongoDB instance

### Backend

```bash
cd backend
npm install
```

Create a `.env` file:

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

Create a `.env` file:

```env
REACT_APP_ENV=development
REACT_APP_BACKEND_URL=http://localhost:8000
```

Start the client:

```bash
npm start
```

## API Endpoints

### Authentication

- `POST /api/v1/users/register`
- `POST /api/v1/users/login`

### Meeting Activity

- `GET /api/v1/users/get_all_activity`
- `POST /api/v1/users/add_to_activity`

### Health Check

- `GET /api/v1/health`

## Engineering Improvements Added

- Cleaner room routing and dashboard join flow
- Better UI structure for landing, auth, dashboard, and history pages
- More professional app metadata and branding
- Safer environment configuration defaults
- Improved history handling and empty states
- Reduced debug-style code and tutorial carryovers

## Next Steps

- Add unit and integration tests for auth flow and history rendering
- Add TURN server support for stronger WebRTC reliability
- Move from custom token storage to JWT + authorization middleware
- Add participant names and join/leave indicators in the meeting room
- Add recording or scheduling as advanced portfolio extensions

## Author

Udit

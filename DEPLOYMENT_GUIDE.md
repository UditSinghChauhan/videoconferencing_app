# Deployment Guide - Bridge

## CORS Error Fix for Render Deployment

### Problem
CORS errors when deployed to Render:
- Frontend: `https://bridgefrontend.onrender.com`
- Backend: `https://bridge-backend-7sul.onrender.com`

### Root Cause
Backend `.env` was configured for **development mode** instead of **production**, causing it to only allow localhost origins.

### Solution

#### Step 1: Update Backend Environment Variables on Render

Go to your [Render Dashboard](https://dashboard.render.com) → Select your backend service → **Settings** → **Environment**

Update these variables:

```
NODE_ENV=production
CORS_ORIGIN=https://bridgefrontend.onrender.com
```

**Keep these the same:**
```
PORT=8000
MONGODB_URI=mongodb+srv://heyitswork2m_db_user:L3t5r3mn7NHXJv95@videoconferencingapp.vemvda2.mongodb.net/Bridge_connect
JWT_SECRET=bridge_secrecy15
JWT_REFRESH_SECRET=secrecy_holds7
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_REFRESH_COOKIE_MAX_AGE_MS=604800000
LOG_LEVEL=info
```

#### Step 2: Save and Redeploy

Click **Save changes** - Render will automatically redeploy your backend with the new environment variables.

#### Step 3: Test

Try registering/logging in on https://bridgefrontend.onrender.com - CORS errors should be gone!

## Local Development

Your local `.env` is now configured to support:
- `http://localhost:3000`
- `http://localhost:3100`
- `http://127.0.0.1:3000`
- `http://127.0.0.1:3100`

To run locally:
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm start
```

## Additional Production Checklist

- [ ] Backend `NODE_ENV=production`
- [ ] Backend `CORS_ORIGIN` includes frontend URL
- [ ] Frontend `REACT_APP_ENV=production`
- [ ] Frontend `REACT_APP_BACKEND_URL` points to deployed backend
- [ ] MongoDB connection string is valid
- [ ] JWT secrets are strong and different from development
- [ ] Backend service is running (check Render logs)
- [ ] Frontend is able to reach the backend health endpoint

## Troubleshooting

### Still seeing CORS errors?

1. Check backend logs on Render for actual errors
2. Verify `NODE_ENV=production` is set (check Settings → Environment)
3. Clear browser cache and hard refresh (Ctrl+Shift+R)
4. Wait 2-3 minutes after updating .env for full redeploy

### Backend returns 404?

Backend service might not be running. Check Render dashboard logs.

### Backend returns 400?

Validation error - check browser console for error details. Usually a missing or invalid field.

## Code Changes Made

1. **Added OPTIONS method to CORS** - Handles preflight requests
2. **Updated `.env.example`** - Shows both dev and production settings
3. **Updated local `.env`** - Supports multiple localhost ports for E2E testing

# Bridge - Deployment Troubleshooting Guide

## Problem 1: CORS Errors on Signup ❌

### Error Messages
```
CORS policy: Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present
```

### Root Cause
Backend environment variables were updated, but **Render did NOT automatically redeploy**.

### Solution

**Step 1: Manual Redeploy on Render**
1. Go to https://dashboard.render.com
2. Click on your **Bridge_Backend** service
3. Click the **"Deployments"** tab
4. Click **"Manual Deploy"** or **"Deploy Latest Commit"**
5. Wait for deployment to complete (5-10 minutes)
6. Check logs to confirm no errors

**Step 2: Verify Environment Variables**
1. Go to **Settings** → **Environment Variables**
2. Confirm these are set:
   ```
   NODE_ENV=production
   CORS_ORIGIN=https://bridgefrontend.onrender.com
   PORT=8000
   ```
3. If any are missing, add them and redeploy

**Step 3: Clear Browser Cache**
- Hard refresh: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)
- Or open in Incognito/Private window

**Step 4: Test Signup**
- Go to https://bridgefrontend.onrender.com
- Click "Create Account"
- Try to register a new account
- Should work without CORS errors

---

## Problem 2: Demo Page Redirects to Auth ❌

### Expected Behavior
- Clicking "Try Demo" should show a guest preview WITHOUT requiring login
- Demo page should display sample participants, chat, and meeting summary

### Actual Behavior
- Clicking "Try Demo" redirects to signup/auth page

### Solution

**Manual Testing**
1. Open your browser developer console (**F12**)
2. Click "Try Demo" on the landing page
3. Check console for any error messages
4. Note the URL - it should be: `https://bridgefrontend.onrender.com/demo`

**If redirected to `/auth`:**
- The `/demo` route should NOT be protected
- This is likely a **React Router cache issue** on Render

**Fix:**
1. Go to your **Frontend** service on Render
2. Click **"Clear Build Cache"** in the settings
3. Click **"Manual Deploy"** or **"Redeploy"**
4. Wait for deployment to complete
5. Hard refresh and try again

---

## Verification Checklist

### Backend
- [ ] `NODE_ENV=production` is set
- [ ] `CORS_ORIGIN=https://bridgefrontend.onrender.com` is set
- [ ] `PORT=8000` is set
- [ ] Manual deploy completed successfully
- [ ] Logs show "Server started" message
- [ ] No error logs visible

### Frontend
- [ ] Build cache cleared
- [ ] Manual deploy completed successfully
- [ ] Hard refresh with Ctrl+Shift+R
- [ ] `/demo` URL loads without redirect
- [ ] `/auth` signup works without CORS errors

### Testing
- [ ] Try Demo button works (no redirect to auth)
- [ ] Signup page loads and can create account
- [ ] No CORS error messages in browser console
- [ ] No 404 errors visible

---

## If Issues Persist

### Check Backend Logs
1. Render dashboard → Backend service → **Logs** tab
2. Look for errors about:
   - MongoDB connection
   - CORS configuration
   - PORT not available
   - Server startup errors

### Check Frontend Logs
1. Open browser **F12** → **Console** tab
2. Look for:
   - Network errors (red X icons)
   - Redirect messages
   - Auth context errors

### Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| Backend shows old logs after env change | Manual deploy, not auto-deploy |
| Frontend still redirects to auth | Clear build cache + redeploy |
| CORS still failing | Hard refresh browser (Ctrl+Shift+R) |
| Signup page loads but requests fail | Check MongoDB connection in backend logs |

---

## After Fixes: What Should Work

✅ **Landing Page** → Try Demo button → **Demo Page** (no login required)  
✅ **Demo Page** → Unlock Full Workspace → **Signup Page**  
✅ **Signup Page** → Create Account → Creates user (no CORS errors)  
✅ **Signup Page** → Sign In → **Home Page** (for authenticated users)  


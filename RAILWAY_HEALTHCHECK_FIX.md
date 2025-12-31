# Railway Healthcheck Failure - Fix Guide

## Issue
Deployment failed during "Network > Healthcheck" step. This usually means:
1. Missing environment variables (app crashes on startup)
2. Healthcheck endpoint not responding
3. App not starting properly

## Solution Steps

### Step 1: Add Required Environment Variables

Go to Railway → Your Service → **Variables** tab, and add:

**Minimum Required:**
```
DATABASE_URL=your_postgres_connection_string
PORT=3000
NODE_ENV=production
```

**For GitHub App (add later after registration):**
```
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=""
GITHUB_APP_WEBHOOK_SECRET=
```

### Step 2: Check Healthcheck Configuration

The healthcheck is set to `/health` in `railway.json`. Make sure:
- Your app has a `/health` endpoint (it does in `src/app.ts`)
- The endpoint returns a 200 status code

### Step 3: Redeploy

After adding environment variables:
1. Railway should auto-redeploy
2. Or manually trigger: Railway → Deployments → Redeploy

### Step 4: Check Deploy Logs

If it still fails:
1. Go to **"Deploy Logs"** tab
2. Check for error messages
3. Common issues:
   - Database connection errors
   - Missing environment variables
   - Port binding issues

---

## Quick Fix Checklist

- [ ] Added `DATABASE_URL` to Railway variables (copy from your Postgres service)
- [ ] Added `PORT=3000` to Railway variables
- [ ] Added `NODE_ENV=production` to Railway variables
- [ ] Service redeployed
- [ ] Checked deploy logs for errors

---

## Get Database URL from Railway

1. In Railway, find your **Postgres** service
2. Go to **Variables** tab
3. Copy the `DATABASE_URL` or `POSTGRES_URL`
4. Paste it into your `street-client` service variables

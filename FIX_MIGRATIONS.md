# Fix: Database Tables Don't Exist

## Problem

The error `The table 'public.Client' does not exist` means migrations haven't run yet.

## Solution: Run Migrations Manually

### Method 1: Using Railway Dashboard

1. Go to Railway → **street-client** service
2. Click **"Deployments"** tab
3. Click on your **latest deployment**
4. Look for **"Run Command"** or **"Terminal"** button
5. Run: `npm run migrate:deploy`

### Method 2: Using Railway CLI

```bash
railway run npm run migrate:deploy
```

---

## What `migrate:deploy` Does

- Applies all pending migrations to the database
- Creates all tables: `Client`, `GitHubInstallation`, `GitHubRepo`, `RepoSyncRun`, `RepoActivityEvent`, `RepoDailySummary`
- Safe to run multiple times (idempotent)

---

## After Running Migrations

Once migrations complete:

- ✅ Tables will be created
- ✅ Frontend will work
- ✅ Webhooks will work
- ✅ API endpoints will work

---

## Verify It Worked

After running migrations, try:

1. Visit frontend: `https://street-client-production.up.railway.app`
2. Should show "No clients found" (instead of error)
3. Or check health endpoint: `/health`

---

## Note

The Dockerfile CMD runs `npm run migrate:deploy && npm start`, but it seems like migrations didn't run during deployment. Running manually should fix it!

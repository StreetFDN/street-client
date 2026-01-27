# Sync Repositories for Existing Installation

## Problem

When a GitHub App is installed with "All repositories", GitHub doesn't send `installation_repositories.added` events. The repositories are just available, but they're not automatically added to the database.

## Solution

I've added two fixes:

### 1. Auto-sync on Installation Created

When a new installation is created (via webhook), the system now automatically fetches all repositories from GitHub.

### 2. Manual Sync Endpoint

For existing installations (like yours), you can manually trigger a sync.

## How to Sync Your Repositories

### Option 1: Use the API (Quick Fix)

1. Find your installation ID from Railway logs or database
2. Call the sync endpoint:

```bash
curl -X POST https://street-client-production.up.railway.app/api/installations/YOUR_INSTALLATION_ID/sync \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

### Option 2: Re-install the GitHub App (Easiest)

1. Go to: https://github.com/settings/installations
2. Find "dev-update by Street Labs"
3. Click "Configure"
4. Click "Uninstall"
5. Then reinstall it (select repositories again)
6. This will trigger the webhook, which will now fetch all repos

### Option 3: Wait for Next Deployment

The code now automatically fetches repos when installations are created, so any new installations will work. But for your existing installation, use Option 1 or 2 above.

---

## After Syncing

Once repos are synced:

- Repositories will appear in the frontend
- Backfill will automatically run (7 days of summaries)
- Daily syncs will run at 2 AM UTC

---

## Verify It Worked

After syncing, visit:

```
https://street-client-production.up.railway.app
```

You should see your repositories listed!

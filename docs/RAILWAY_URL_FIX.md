# Railway Connection String - Important Note

## Internal vs External URL

Railway provides two types of connection strings:

1. **Internal URL** (what you have): `postgres.railway.internal`
   - Only works from within Railway's network
   - Won't work from your local machine

2. **External URL** (what you need for local dev):
   - Usually something like: `containers-us-west-xxx.railway.app` or `xxxx.up.railway.app`
   - Works from anywhere

## How to Get the External URL

1. In Railway, click on your **PostgreSQL** service
2. Go to **"Variables"** tab
3. Look for **"Public Networking"** or **"Networking"** section
4. Enable **"Public Networking"** if it's not enabled
5. Railway will give you a **public URL** - use that instead

Or:

1. In Railway PostgreSQL service → **"Settings"**
2. Look for **"Network"** or **"Public URL"**
3. Enable public networking to get the external URL

## Alternative: Use Railway CLI Tunnel

If you can't find the external URL, you can use Railway CLI to create a tunnel:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Create tunnel
railway connect
```

Then use: `postgresql://postgres:PASSWORD@localhost:5432/railway?schema=public`

---

## Quick Fix

If the connection doesn't work with `postgres.railway.internal`, go back to Railway and look for the **public/external** connection string in the Variables tab.

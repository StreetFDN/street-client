# Get Railway External/Public URL

The connection string you have uses `postgres.railway.internal` which only works inside Railway. You need the **external/public** URL for local development.

## Step-by-Step to Get External URL

### Option 1: Enable Public Networking (Easiest)

1. In Railway, click on your **PostgreSQL** service
2. Go to **"Settings"** tab
3. Look for **"Networking"** or **"Public Networking"** section
4. Enable **"Public Networking"** or **"Make Public"**
5. Railway will generate a public URL - copy that!

### Option 2: Check Variables Tab Again

1. Click on your **PostgreSQL** service
2. Go to **"Variables"** tab  
3. Look for:
   - **"POSTGRES_URL"** (might be public)
   - **"DATABASE_URL"** (might have both internal and external)
   - Scroll down to see if there's a separate **"Public URL"
   ** variable

### Option 3: Use Railway CLI (Alternative)

If you can't find a public URL, use Railway CLI to tunnel:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# In your project directory, link to your Railway project
railway link

# Connect (creates a tunnel)
railway connect
```

Then use: `postgresql://postgres:ZxnOjKmXLNKWpBUlTeUZIeZCCAgqOmLo@localhost:5432/railway?schema=public`

## What the External URL Looks Like

The external URL will have a domain like:
- `containers-us-west-xxx.railway.app`
- `xxxx.up.railway.app`
- `xxxx.railway.app`

NOT `postgres.railway.internal` (that's internal only)

## Once You Have It

Update your `.env` file:

```env
DATABASE_URL="postgresql://postgres:ZxnOjKmXLNKWpBUlTeUZIeZCCAgqOmLo@EXTERNAL-URL-HERE:5432/railway?schema=public"
```

Replace `EXTERNAL-URL-HERE` with the external domain Railway gives you.

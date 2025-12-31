# Railway CLI Setup for Local Development

## Problem

The DATABASE_URL from Railway Variables uses `postgres.railway.internal` which only works **inside Railway's network**, not from your local machine.

## Solution: Use Railway CLI Tunnel

Railway CLI can create a secure tunnel so you can connect to the internal database from your local machine.

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

Or using Homebrew (macOS):
```bash
brew install railway
```

### Step 2: Login to Railway

```bash
railway login
```

This will open a browser for authentication.

### Step 3: Link to Your Project

In your project directory:

```bash
cd /Users/lukasgruber/street-client
railway link
```

Select your Railway project when prompted.

### Step 4: Create Tunnel

```bash
railway connect postgres
```

This creates a local tunnel. You'll see output like:
```
Connected to postgres via localhost:5432
```

### Step 5: Update .env

Use localhost with the tunnel:

```env
DATABASE_URL="postgresql://postgres:ZxnOjKmXLNKWpBUlTeUZIeZCCAgqOmLo@localhost:5432/railway?schema=public"
```

### Step 6: Keep Tunnel Running

Keep the `railway connect postgres` command running in a separate terminal, and run your migrations in another terminal.

---

## Alternative: Use Proxied Connection

From your Railway Networking settings, you can also use the proxied connection:
- `tramway.proxy.rlwy.net:45858`

Update .env:
```env
DATABASE_URL="postgresql://postgres:ZxnOjKmXLNKWpBUlTeUZIeZCCAgqOmLo@tramway.proxy.rlwy.net:45858/railway?schema=public"
```

This might require additional network configuration, so Railway CLI tunnel is often more reliable.

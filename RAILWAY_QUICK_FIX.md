# Quick Fix: Railway Connection

## The Issue

Railway's DATABASE_URL uses `postgres.railway.internal` which **only works inside Railway**, not from your local machine.

## Quick Solution Options

### Option 1: Use Railway CLI Tunnel (Recommended)

1. **Login to Railway:**
   ```bash
   railway login
   ```

2. **Link your project:**
   ```bash
   cd /Users/lukasgruber/street-client
   railway link
   ```
   (Select your Railway project)

3. **Create tunnel (keep this running in a terminal):**
   ```bash
   railway connect postgres
   ```

4. **Update .env to use localhost:**
   ```env
   DATABASE_URL="postgresql://postgres:ZxnOjKmXLNKWpBUlTeUZIeZCCAgqOmLo@localhost:5432/railway?schema=public"
   ```

5. **In another terminal, run migrations:**
   ```bash
   npm run migrate
   ```

### Option 2: Use Proxied Connection (Current)

Your `.env` already has:
```env
DATABASE_URL="postgresql://postgres:ZxnOjKmXLNKWpBUlTeUZIeZCCAgqOmLo@tramway.proxy.rlwy.net:45858/railway?schema=public"
```

If this doesn't connect, try Option 1 (Railway CLI tunnel).

---

**Railway CLI is already installed!** Just run the commands above.

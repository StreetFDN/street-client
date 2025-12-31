# Complete Railway Setup - Final Steps

## ✅ What's Done
- Railway CLI installed
- Logged in to Railway
- Project linked to "comfortable-appreciation"

## Next Steps

### 1. Create Railway Tunnel

In a terminal, run (keep this running):
```bash
railway connect postgres
```

This will create a tunnel and show something like:
```
Connected to postgres via localhost:5432
```

**Keep this terminal open!**

### 2. Update .env to Use Localhost

Update your `.env` file:
```env
DATABASE_URL="postgresql://postgres:ZxnOjKmXLNKWpBUlTeUZIeZCCAgqOmLo@localhost:5432/railway?schema=public"
```

### 3. Run Migrations (in a NEW terminal)

Open a **new terminal** (keep the tunnel running in the first one) and run:
```bash
npm run migrate
```

This should now work because the tunnel connects localhost:5432 to Railway's database!

---

## Quick Commands Summary

**Terminal 1 (keep running):**
```bash
railway connect postgres
```

**Terminal 2:**
```bash
npm run migrate
```

---

## If You See "Missing script: migrate"

The script exists in package.json. Try:
```bash
npx prisma migrate dev
```

Or make sure you're in the project directory:
```bash
cd /Users/lukasgruber/street-client
npm run migrate
```

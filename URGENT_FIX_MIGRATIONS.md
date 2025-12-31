# URGENT: Run Migrations - Database Tables Missing

## The Problem

The logs show: `The table 'public.Client' does not exist`

This means **migrations haven't run**. The database is empty.

## Quick Fix: Run Migrations Now

### Step 1: Run Migrations in Railway

**Option A: Railway Dashboard**
1. Railway → **street-client** service
2. **Deployments** tab
3. Click latest deployment
4. Find **"Run Command"** or **"Terminal"** button
5. Run: `npm run migrate:deploy`

**Option B: Railway CLI**
```bash
railway run npm run migrate:deploy
```

### Step 2: Verify It Worked

After migrations run, you should see output like:
```
✔ Applied migration...
✔ Generated Prisma Client...
```

Then test:
- Visit: `https://street-client-production.up.railway.app`
- Should show frontend (not error)

---

## Why This Happened

The Dockerfile CMD runs `npm run migrate:deploy && npm start`, but:
- Prisma CLI might not be in production dependencies
- Or migrations failed silently during startup

I've added `prisma` to dependencies - but you still need to run migrations manually first!

---

## After Migrations

Once tables are created:
- ✅ Frontend will work
- ✅ API will work  
- ✅ Webhooks will work
- ✅ Everything will function normally

**Run the migration command now!**

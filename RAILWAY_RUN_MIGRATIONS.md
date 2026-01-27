# How to Run Migrations in Railway

## Step-by-Step Guide

### Method 1: Using Railway Dashboard (Easiest)

1. **After deployment completes**, go to your **street-client** service in Railway
2. Click on the **"Deployments"** tab (at the top, next to "Variables")
3. Click on your **latest deployment** (the most recent one, should be at the top)
4. You'll see deployment details with tabs/buttons
5. Look for a button that says:
   - **"Run Command"** or
   - **"Terminal"** or
   - **"Shell"** or
   - An icon that looks like a terminal/command prompt
6. Click it - a terminal/command interface will open
7. Type: `npm run migrate`
8. Press Enter

### Method 2: Using Railway CLI (Alternative)

If you have Railway CLI installed:

```bash
# Make sure you're in the project
railway link

# Run migrations
railway run npm run migrate
```

### Method 3: If "Run Command" isn't visible

1. Go to your service → **"Settings"** tab
2. Look for **"Run Command"** or **"Shell"** option
3. Or try the **"Deploy Logs"** tab - sometimes there's a command interface there

---

## What You Should See

After running `npm run migrate`, you should see output like:

```
> street-client@1.0.0 migrate
> prisma migrate dev

Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma

✔ Generated Prisma Client...
✔ Applied migration...
```

If you see errors, check:

- DATABASE_URL is correct
- Database is accessible
- Network connectivity

---

## Quick Visual Guide

**Railway Dashboard Path:**

```
street-client service
  → Deployments tab
    → Click latest deployment
      → Look for "Run Command" / "Terminal" button
        → Type: npm run migrate
```

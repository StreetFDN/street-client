# Supabase Database Setup

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up / Log in
3. Click **"New Project"**
4. Fill in:
   - **Name**: street-client (or any name)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you
   - Click **"Create new project"**

Wait a few minutes for the project to be ready.

---

## Step 2: Get Your Connection String

1. In your Supabase project dashboard, go to **Settings** (gear icon in sidebar)
2. Click **"Database"** in the settings menu
3. Scroll down to **"Connection string"** section
4. Under **"Connection pooling"**, select **"Transaction"** mode
5. Copy the connection string - it looks like:
   ```
   postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

**Important**: Replace `[YOUR-PASSWORD]` with the database password you created in Step 1!

---

## Step 3: Update Your .env File

1. Open `.env` file in Cursor
2. Find the `DATABASE_URL` line
3. Replace it with your Supabase connection string

**Before:**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/street_client?schema=public"
```

**After (example):**
```env
DATABASE_URL="postgresql://postgres.xxxxx:yourpassword@aws-0-us-east-1.pooler.supabase.com:6543/postgres?schema=public"
```

**Important Notes:**
- Make sure to replace `[YOUR-PASSWORD]` with your actual password
- Add `?schema=public` at the end if it's not already there (Prisma needs this)
- Use the **Transaction** mode connection string (port 6543), not Session mode (port 5432)

---

## Step 4: Run Migrations

After updating `.env`, run:

```bash
npm run generate
npm run migrate
```

This will create all the tables in your Supabase database.

---

## Step 5: Verify It Works

You can verify your tables were created:

1. Go to Supabase dashboard → **Table Editor**
2. You should see these tables:
   - `Client`
   - `GitHubInstallation`
   - `GitHubRepo`
   - `RepoSyncRun`
   - `RepoActivityEvent`
   - `RepoDailySummary`

---

## Troubleshooting

### "Connection refused" or "timeout"
- Check if your connection string has the correct password (no `[YOUR-PASSWORD]` placeholder)
- Make sure you're using the **Transaction** mode connection string (port 6543)

### "schema 'public' does not exist"
- Make sure `?schema=public` is at the end of your DATABASE_URL
- Supabase uses the `public` schema by default

### "password authentication failed"
- Double-check your password (it's the one you set when creating the project)
- You can reset it in Supabase: Settings → Database → Database password

### "database does not exist"
- You don't need to create a database in Supabase - use the default `postgres` database
- The connection string should end with `/postgres` (not `/street_client`)

---

## Alternative: Direct Connection (without pooling)

If connection pooling doesn't work, you can use the direct connection:

1. In Supabase: Settings → Database
2. Under **"Connection string"**, select **"Session"** mode
3. Copy the connection string (port 5432)
4. Add `?schema=public` at the end
5. Update your `.env` file

Example:
```env
DATABASE_URL="postgresql://postgres:yourpassword@db.xxxxx.supabase.co:5432/postgres?schema=public"
```

---

## Security Note

Your `.env` file contains sensitive credentials - make sure:
- ✅ It's in `.gitignore` (already is)
- ✅ Never commit it to git
- ✅ Don't share it publicly

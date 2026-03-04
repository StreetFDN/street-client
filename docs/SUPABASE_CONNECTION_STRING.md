# Where to Find Supabase Connection String (Alternative Locations)

## It's NOT on Database Settings Page

The connection string is usually in one of these places:

## Option 1: Connection Pooling (Most Common)

1. **In the left sidebar**, look under **"PLATFORM"** section
2. Click on **"Connection Pooling"** (not "Settings")
3. You'll see connection strings there with different modes:
   - Transaction mode (recommended)
   - Session mode

## Option 2: Project Settings → API

1. Click on **"Project Settings"** (gear icon in the top bar, or in sidebar)
2. Go to **"API"** or **"Database"** tab
3. Look for **"Connection string"** or **"Connection info"**

## Option 3: Build Connection String Manually

If you can't find it, you can build it from the connection parameters:

1. On **Database Settings** page, look for **"Connection parameters"** or **"Database URL"**
2. Or check **"Connection Pooling"** for:
   - Host
   - Port (6543 for Transaction mode, 5432 for Session mode)
   - Database name (usually `postgres`)
   - User (usually `postgres.xxxxx` where xxxxx is your project ref)

Then build the connection string:

```
postgresql://postgres.xxxxx:YOUR-PASSWORD@host:port/postgres?schema=public
```

## Option 4: Check Project Overview

1. Go to **Project Overview** (home icon)
2. Look for database connection info there

## Quick Test: Try Connection Pooling Section

**Most likely location:**

- Left sidebar → **"Connection Pooling"** (under PLATFORM section)
- This is where Supabase usually shows connection strings with pooling options

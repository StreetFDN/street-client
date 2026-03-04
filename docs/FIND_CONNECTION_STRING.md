# How to Find Supabase Connection String

## You're in the Right Place!

You're currently on: **Settings → Database → Settings**

## Where to Find the Connection String

1. **Scroll down** on the current page (Database Settings)
2. Look for a section called **"Connection string"** or **"Connection info"**
3. It's usually below the "SSL Configuration" section

## What You'll See

The connection string section will have:

- **URI mode** (this is what you need)
- **Transaction mode** (recommended for Prisma)
- **Session mode** (alternative)

## Step-by-Step

1. **On the Database Settings page**, scroll down past:
   - Database password ✅ (you're here)
   - Connection pooling configuration
   - Pool Size
   - Max Client Connections
   - SSL Configuration

2. **Keep scrolling** until you see:
   - **"Connection string"** section
   - Or **"Connection info"** or **"Connection parameters"**

3. **Select "Transaction" mode** (or "URI" mode)

4. **Copy the connection string** - it will look like:

   ```
   postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

5. **Replace `[YOUR-PASSWORD]`** with your password: `Sadzod-fythi6-wuvmyz`

## Alternative: Connection Pooling Tab

If you don't see it on Settings, try:

1. In the left sidebar, under **"Database"**
2. Look for **"Connection Pooling"** (under PLATFORM section)
3. Click on it
4. Find the connection string there

## What Your Final DATABASE_URL Should Look Like

After you copy the connection string and replace `[YOUR-PASSWORD]`, add `?schema=public` at the end:

```env
DATABASE_URL="postgresql://postgres.xxxxx:Sadzod-fythi6-wuvmyz@aws-0-us-east-1.pooler.supabase.com:6543/postgres?schema=public"
```

**Important**:

- Replace `xxxxx` with your actual project reference (from the connection string)
- Use your password: `Sadzod-fythi6-wuvmyz`
- Make sure `?schema=public` is at the end

# Railway Database Setup

Railway makes this super easy! Here's how to set it up:

## Step 1: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up / Log in (can use GitHub to sign in)
3. Click **"New Project"**

## Step 2: Create PostgreSQL Database

1. In your Railway project, click **"+ New"** button
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway will automatically create a PostgreSQL database for you
4. Wait a few seconds for it to provision

## Step 3: Get Connection String

Railway makes this super easy - the connection string is right there!

1. Click on the **PostgreSQL** service in your project
2. Go to the **"Variables"** tab (or it might be visible on the main page)
3. Look for **"DATABASE_URL"** or **"POSTGRES_URL"** or **"Postgres Connection URL"**
4. Click the **copy icon** next to it - that's your connection string!

The connection string will look like:

```
postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway
```

## Step 4: Update Your .env File

1. Open `.env` file in Cursor
2. Replace the `DATABASE_URL` line with the connection string from Railway
3. **Add `?schema=public` at the end** if it's not already there

**Example:**

```env
DATABASE_URL="postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway?schema=public"
```

## Step 5: Run Migrations

```bash
npm run generate
npm run migrate
```

That's it! Railway handles everything else automatically.

---

## Where to Find Connection String in Railway

### Method 1: Variables Tab (Easiest)

1. Click on your **PostgreSQL** service
2. Click **"Variables"** tab
3. Find **"DATABASE_URL"** or **"POSTGRES_URL"**
4. Copy it!

### Method 2: Connect Tab

1. Click on your **PostgreSQL** service
2. Click **"Connect"** or **"Data"** tab
3. Connection string should be visible there

### Method 3: Settings

1. Click on your **PostgreSQL** service
2. Click **"Settings"**
3. Look for connection info

---

## Railway Connection String Format

Railway's connection string usually looks like:

```
postgresql://postgres:PASSWORD@CONTAINER-URL:PORT/DATABASE
```

Just make sure to add `?schema=public` at the end for Prisma:

```
postgresql://postgres:PASSWORD@CONTAINER-URL:PORT/DATABASE?schema=public
```

---

## Benefits of Railway

✅ Super easy to find connection strings  
✅ Automatic backups  
✅ Free tier available  
✅ Easy to scale  
✅ Simple interface

---

## Troubleshooting

### "Connection refused"

- Make sure you copied the entire connection string
- Check that `?schema=public` is at the end

### "password authentication failed"

- Make sure you copied the password correctly (it's in the connection string)

### Can't find connection string

- Look in the **Variables** tab of your PostgreSQL service
- Or check the **Connect** or **Data** tab
- It's always visible somewhere in the PostgreSQL service page

---

## Quick Checklist

- [ ] Created Railway account
- [ ] Created new project
- [ ] Added PostgreSQL database
- [ ] Copied DATABASE_URL from Variables tab
- [ ] Added `?schema=public` to the end
- [ ] Updated `.env` file
- [ ] Ran `npm run generate`
- [ ] Ran `npm run migrate`

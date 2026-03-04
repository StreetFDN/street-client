# DATABASE_URL Guide

## Where to Find It

The `DATABASE_URL` is in your `.env` file:

```
/Users/lukasgruber/street-client/.env
```

**To edit it:**

- Open the file in Cursor (it should show up in the file explorer)
- Or: Right-click on `.env` in the sidebar → Open

---

## Current Value (Placeholder)

Right now it says:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/street_client?schema=public"
```

This is a **template** - you need to replace `user:password` with real credentials.

---

## How to Get Your DATABASE_URL

### Option 1: Use Docker (Easiest - Recommended)

**Step 1:** Run the setup script:

```bash
./setup-db-docker.sh
```

**Step 2:** Update your `.env` file with this:

```env
DATABASE_URL="postgresql://postgres:streetpass@localhost:5432/street_client?schema=public"
```

That's it! The script creates everything for you.

---

### Option 2: Use Existing PostgreSQL

If you already have PostgreSQL installed:

**Step 1:** Create the database:

```bash
createdb street_client
# or
psql postgres -c "CREATE DATABASE street_client;"
```

**Step 2:** Update `.env` with your credentials:

**If no password (common on macOS):**

```env
DATABASE_URL="postgresql://yourusername@localhost:5432/street_client?schema=public"
```

(Replace `yourusername` with your macOS username - run `whoami` to find it)

**If you have a password:**

```env
DATABASE_URL="postgresql://username:password@localhost:5432/street_client?schema=public"
```

---

### Option 3: Use a Cloud Database

If using Supabase, Railway, Neon, etc.:

1. Create a PostgreSQL database on your provider
2. They'll give you a connection string that looks like:
   ```
   postgresql://user:pass@host.region.provider.com:5432/dbname?sslmode=require
   ```
3. Just paste it in `.env`:
   ```env
   DATABASE_URL="paste_their_connection_string_here"
   ```

---

## DATABASE_URL Format Explained

```
postgresql://username:password@host:port/database_name?schema=public
```

- `username`: PostgreSQL username (often `postgres` or your system username)
- `password`: PostgreSQL password (can be empty)
- `host`: Usually `localhost` (or cloud provider's host)
- `port`: Usually `5432` (default PostgreSQL port)
- `database_name`: `street_client` (the database we're using)
- `schema=public`: Required for Prisma

---

## Quick Test

After setting up, test your connection:

```bash
# This will show an error if DATABASE_URL is wrong
npm run generate

# This will create tables if connection works
npm run migrate
```

If you see errors, check:

1. PostgreSQL is running: `docker ps` (if using Docker) or `brew services list` (if local)
2. Credentials are correct in `.env`
3. Database exists: `psql -l` (should list `street_client`)

# Database Setup Guide

## Quick Setup

### Option 1: Using PostgreSQL locally

1. **Check if PostgreSQL is installed:**

   ```bash
   psql --version
   ```

2. **If not installed (macOS):**

   ```bash
   brew install postgresql@15
   brew services start postgresql@15
   ```

3. **Create the database:**

   ```bash
   # Connect to PostgreSQL (default user is usually your system user or 'postgres')
   psql postgres

   # In PostgreSQL prompt, create database:
   CREATE DATABASE street_client;
   \q
   ```

4. **Update your .env file:**

   ```bash
   # Open .env file
   # Update DATABASE_URL with your credentials:
   DATABASE_URL="postgresql://username:password@localhost:5432/street_client?schema=public"
   ```

   **Examples:**
   - If using default postgres user: `DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/street_client?schema=public"`
   - If using your system user (no password): `DATABASE_URL="postgresql://yourusername@localhost:5432/street_client?schema=public"`
   - If using a specific user: `DATABASE_URL="postgresql://dbuser:dbpass@localhost:5432/street_client?schema=public"`

5. **Run migrations:**
   ```bash
   npm run generate
   npm run migrate
   ```

### Option 2: Using Docker (easiest)

1. **Run PostgreSQL in Docker:**

   ```bash
   docker run --name street-postgres \
     -e POSTGRES_PASSWORD=streetpass \
     -e POSTGRES_DB=street_client \
     -p 5432:5432 \
     -d postgres:15
   ```

2. **Update .env:**

   ```env
   DATABASE_URL="postgresql://postgres:streetpass@localhost:5432/street_client?schema=public"
   ```

3. **Run migrations:**
   ```bash
   npm run generate
   npm run migrate
   ```

### Option 3: Using a cloud database (Supabase, Railway, etc.)

1. **Create a PostgreSQL database** on your cloud provider
2. **Copy the connection string** they provide
3. **Update .env:**
   ```env
   DATABASE_URL="your_cloud_connection_string_here"
   ```
4. **Run migrations:**
   ```bash
   npm run generate
   npm run migrate
   ```

## Troubleshooting

### "psql: command not found"

- Install PostgreSQL (see Option 1 above)
- Or use Docker (Option 2)

### "password authentication failed"

- Check your username and password
- Try connecting manually first: `psql -U username -d postgres`
- On macOS, you might not need a password if using your system user

### "database already exists"

- That's fine! Just continue with migrations

### "connection refused"

- Make sure PostgreSQL is running: `brew services list` (macOS)
- Check if PostgreSQL is listening: `lsof -i :5432`
- Restart PostgreSQL: `brew services restart postgresql@15`

### Connection String Format

The format is always:

```
postgresql://username:password@host:port/database_name?schema=public
```

- `username`: Your PostgreSQL username
- `password`: Your PostgreSQL password (can be omitted if no password)
- `host`: Usually `localhost` for local, or IP/domain for remote
- `port`: Usually `5432` (default PostgreSQL port)
- `database_name`: `street_client` (the database we're creating)
- `schema=public`: Required for Prisma

## After Setup

Once your database is set up and `.env` is configured:

```bash
# Generate Prisma client (reads your DATABASE_URL from .env)
npm run generate

# Run migrations (creates all tables)
npm run migrate

# Verify it worked
npm run studio  # Opens Prisma Studio to view your database
```

You should see all the tables created: `Client`, `GitHubInstallation`, `GitHubRepo`, `RepoSyncRun`, `RepoActivityEvent`, `RepoDailySummary`.

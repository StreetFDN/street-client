# Quick Start - Database Setup

## Step-by-Step

### 1. Install PostgreSQL (choose one)

**Option A: Docker (Recommended - Easiest)**
```bash
docker run --name street-postgres \
  -e POSTGRES_PASSWORD=streetpass \
  -e POSTGRES_DB=street_client \
  -p 5432:5432 \
  -d postgres:15
```

**Option B: Local Installation (macOS)**
```bash
brew install postgresql@15
brew services start postgresql@15
```

### 2. Edit `.env` file

The `.env` file is in your project root: `/Users/lukasgruber/street-client/.env`

**For Docker (Option A):**
Update this line in `.env`:
```env
DATABASE_URL="postgresql://postgres:streetpass@localhost:5432/street_client?schema=public"
```

**For Local PostgreSQL (Option B):**
First create the database:
```bash
createdb street_client
# or
psql postgres -c "CREATE DATABASE street_client;"
```

Then update `.env` with your credentials:
```env
DATABASE_URL="postgresql://yourusername@localhost:5432/street_client?schema=public"
# or if you have a password:
DATABASE_URL="postgresql://username:password@localhost:5432/street_client?schema=public"
```

### 3. Run Database Commands

```bash
# Generate Prisma client (reads DATABASE_URL from .env)
npm run generate

# Create all database tables
npm run migrate
```

### 4. Verify It Worked

```bash
# Open Prisma Studio to see your database
npm run studio
```

You should see tables: `Client`, `GitHubInstallation`, `GitHubRepo`, etc.

---

## Full `.env` File Template

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database - UPDATE THIS!
DATABASE_URL="postgresql://postgres:streetpass@localhost:5432/street_client?schema=public"

# GitHub App (you'll add these later when creating the GitHub App)
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=""
GITHUB_APP_WEBHOOK_SECRET=

# OpenAI (optional - for LLM summaries)
OPENAI_API_KEY=

# Base URL for webhooks
BASE_URL=http://localhost:3000
```

## Next Steps

After database setup:
1. ✅ Database is ready
2. Create GitHub App (see SETUP.md)
3. Add GitHub App credentials to `.env`
4. Start server: `npm run dev`

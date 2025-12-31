# Street Client - Dev Update Engine

Automated daily GitHub activity summaries for development teams and investors.

## Overview

This service connects to GitHub repositories via GitHub App and generates daily summaries of development activity. It tracks merged PRs, releases, and commits, then uses LLM to generate brief, professional summaries.

## Features

- **GitHub App Integration**: Secure, read-only access via GitHub App (supports private repos)
- **Daily Automated Sync**: Runs once per day at 2 AM UTC to generate summaries
- **Backfill on Connect**: When a repo is first connected, automatically generates summaries for the last 7 days
- **Multi-Repo Support**: Track multiple repositories per client
- **RESTful API**: Query summaries by client, repo, date range
- **LLM Summaries**: Uses OpenAI to generate professional summaries (with fallback to template-based)

## Setup

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- GitHub App (see below)
- OpenAI API key (optional, for LLM summaries)

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

Create a PostgreSQL database and set the connection string:

```bash
# Create .env file
cp .env.example .env

# Edit .env and set DATABASE_URL
DATABASE_URL="postgresql://user:password@localhost:5432/street_client?schema=public"
```

Run migrations:

```bash
npm run generate  # Generate Prisma client
npm run migrate   # Run database migrations
```

### 3. GitHub App Setup

1. Go to GitHub → Settings → Developer settings → GitHub Apps
2. Create a new GitHub App with these settings:
   - **Name**: Your app name
   - **Homepage URL**: Your app URL
   - **Webhook URL**: `https://yourdomain.com/webhooks/github`
   - **Webhook secret**: Generate a random secret (save it!)

3. Set **Permissions** (all Read-only):
   - Repository contents: Read (optional)
   - Pull requests: Read
   - Issues: Read
   - Metadata: Read (required)
   - Commit statuses: Read (optional)

4. Subscribe to **Webhook events**:
   - `installation`
   - `installation_repositories`

5. After creating the app:
   - Copy the **App ID**
   - Generate a **Private key** (download the .pem file)
   - Copy the **Webhook secret**

6. Add to `.env`:
```env
GITHUB_APP_ID=your_app_id
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_APP_WEBHOOK_SECRET=your_webhook_secret
```

**Note**: The private key should be the entire PEM content. If you have line breaks, use `\n` or put the entire key in quotes with actual newlines.

### 4. OpenAI Setup (Optional)

For LLM-generated summaries:

```env
OPENAI_API_KEY=sk-...
```

If not provided, the service will use template-based summaries.

### 5. Run the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm run build
npm start
```

## Usage

### 1. Install GitHub App

Users/organizations install your GitHub App on their repositories. When installed, webhooks will automatically:
- Create a client record
- Create installation record
- List available repos
- When repos are selected, backfill last 7 days

### 2. API Endpoints

#### Health Check
```
GET /health
```

#### Clients
```
GET    /api/clients
GET    /api/clients/:clientId
POST   /api/clients
```

#### Installations
```
GET    /api/installations
GET    /api/clients/:clientId/installations
GET    /api/installations/:installationId/repos
```

#### Repositories
```
GET    /api/clients/:clientId/repos
GET    /api/repos/:repoId
POST   /api/repos/:repoId/enable
POST   /api/repos/:repoId/disable
POST   /api/repos/:repoId/backfill
```

#### Summaries
```
GET    /api/repos/:repoId/summaries?from=2024-01-01&to=2024-01-31
GET    /api/clients/:clientId/repos/:repoId/summaries?from=2024-01-01&to=2024-01-31
GET    /api/clients/:clientId/summaries?from=2024-01-01&to=2024-01-31
```

### Example: Get Summaries

```bash
# Get summaries for a repo
curl http://localhost:3000/api/repos/REPO_ID/summaries?from=2024-01-01&to=2024-01-31

# Get all summaries for a client
curl http://localhost:3000/api/clients/CLIENT_ID/summaries?from=2024-01-01
```

## Architecture

### Core Components

- **GitHub App Authentication**: JWT-based auth, installation tokens
- **GitHub Fetcher**: Fetches PRs, releases, commits via GitHub API
- **Summarizer**: Uses OpenAI LLM (or fallback) to generate summaries
- **Sync Service**: Orchestrates fetching, summarizing, storing
- **Scheduler**: Cron job runs daily at 2 AM UTC
- **Webhooks**: Handles installation events from GitHub
- **API**: REST endpoints for querying data

### Data Model

- `Client`: Top-level entity representing a customer
- `GitHubInstallation`: GitHub App installation on an account
- `GitHubRepo`: Repository being tracked
- `RepoSyncRun`: Record of each sync job execution
- `RepoActivityEvent`: Raw activity events (commits, PRs, etc.)
- `RepoDailySummary`: Generated daily summaries

### Daily Sync Process

1. Scheduler triggers at 2 AM UTC
2. For each enabled repo:
   - Define 24h window (now - 24h to now)
   - Fetch merged PRs, releases, commits
   - Store activity events
   - Generate summary via LLM
   - Store/update daily summary (idempotent by repo + date)

### Backfill Process

When a repo is first connected:
1. Generate 7 calendar days (today - 6 days back to today)
2. For each day (00:00 to 23:59 UTC):
   - Fetch activity
   - Generate summary
   - Store daily summary

## Development

### Database Management

```bash
# View data in Prisma Studio
npm run studio

# Create a new migration
npm run migrate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

### Environment Variables

See `.env.example` for all required variables.

## Production Considerations

1. **Webhook Security**: Always set `GITHUB_APP_WEBHOOK_SECRET` in production
2. **Database**: Use connection pooling, backups
3. **Rate Limits**: GitHub API rate limits are handled via installation tokens (higher limits)
4. **Error Handling**: Sync runs log errors; failed runs are stored in `repo_sync_runs`
5. **Monitoring**: Consider adding logging/metrics for:
   - Sync run success/failure rates
   - API response times
   - GitHub API rate limit usage

## License

MIT

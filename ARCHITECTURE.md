# Architecture Overview

## System Components

### 1. GitHub Integration (`src/services/github/`)

- **auth.ts**: GitHub App authentication using JWT and installation tokens
  - `getInstallationOctokit()`: Creates authenticated Octokit client for installation-level API calls
  - `getAppOctokit()`: Creates authenticated Octokit client for app-level API calls

- **fetcher.ts**: Fetches GitHub activity data
  - `fetchRepoActivity()`: Fetches merged PRs, releases, and commits within a time window
  - Returns structured `ActivityPacket` with counts and events

### 2. Summarization (`src/services/summarizer.ts`)

- **generateSummary()**: Creates daily summaries from activity data
  - Uses OpenAI GPT-4o-mini if API key is configured
  - Falls back to template-based summaries if no API key
  - Handles "no changes" case

### 3. Sync Service (`src/services/sync.ts`)

- **syncRepo()**: Syncs a single repo for a time window
  - Fetches activity
  - Stores activity events (optional, for debugging)
  - Generates summary
  - Stores/updates daily summary (idempotent by repo + date)

- **syncAllReposDaily()**: Orchestrates daily sync for all enabled repos
  - Uses 24h rolling window (now - 24h to now)

- **backfillRepo()**: Generates 7 days of summaries for a newly added repo
  - Creates summaries for last 7 calendar days (00:00 to 23:59 UTC each day)

### 4. Scheduler (`src/worker/scheduler.ts`)

- **startScheduler()**: Sets up cron job
  - Runs daily at 2 AM UTC
  - Triggers `syncAllReposDaily()`

### 5. Webhooks (`src/routes/webhooks.ts`)

- Handles GitHub webhook events:
  - `installation.created`: Creates client and installation records
  - `installation.deleted`: Marks installation as revoked
  - `installation_repositories.added`: Creates repo records and triggers backfill

### 6. API Routes

#### Clients (`src/routes/clients.ts`)
- `GET /api/clients`: List all clients
- `GET /api/clients/:id`: Get client details
- `POST /api/clients`: Create client

#### Installations (`src/routes/installations.ts`)
- `GET /api/installations`: List all installations
- `GET /api/clients/:clientId/installations`: List installations for client
- `GET /api/installations/:installationId/repos`: List available repos from GitHub

#### Repositories (`src/routes/repos.ts`)
- `GET /api/clients/:clientId/repos`: List repos for client
- `GET /api/repos/:repoId`: Get repo details
- `POST /api/repos/:repoId/enable`: Enable repo syncing
- `POST /api/repos/:repoId/disable`: Disable repo syncing
- `POST /api/repos/:repoId/backfill`: Manually trigger backfill

#### Summaries (`src/routes/summaries.ts`)
- `GET /api/repos/:repoId/summaries`: Get summaries for a repo
- `GET /api/clients/:clientId/repos/:repoId/summaries`: Get summaries (with client validation)
- `GET /api/clients/:clientId/summaries`: Get aggregated summaries across all client repos

## Data Flow

### Daily Sync Flow

1. **Scheduler triggers** (2 AM UTC daily)
2. For each enabled repo:
   - Define 24h window
   - Fetch activity (PRs, releases, commits)
   - Store activity events
   - Generate summary (LLM or template)
   - Upsert daily summary

### Repository Addition Flow

1. **User installs GitHub App** on repos
2. **Webhook received**: `installation_repositories.added`
3. For each added repo:
   - Fetch full repo details from GitHub
   - Create/update repo record
   - Trigger 7-day backfill
   - For each day (last 7 days):
     - Fetch activity for that day
     - Generate summary
     - Store daily summary

### Summary Generation Flow

1. **Input**: Activity packet (PRs, releases, commits)
2. **Decision**:
   - If no activity → "No relevant GitHub changes in the last 24h."
   - If activity → Generate summary
3. **LLM Path** (if OpenAI key configured):
   - Build prompt with activity items
   - Call OpenAI API (GPT-4o-mini)
   - Return generated summary
4. **Fallback Path**:
   - Build template summary from counts
   - Include top item details
5. **Output**: Summary text + stats JSON

## Database Schema

### Core Tables

- **Client**: Top-level entity (customer/organization)
- **GitHubInstallation**: GitHub App installation record
- **GitHubRepo**: Repository being tracked
- **RepoSyncRun**: Execution log for sync jobs
- **RepoActivityEvent**: Raw activity events (optional, for debugging)
- **RepoDailySummary**: Generated daily summaries (unique by repo + date)

### Key Constraints

- `repo_daily_summaries`: Unique constraint on `(repo_id, date)` for idempotency
- `github_repos`: Unique constraint on `(client_id, owner, name)`
- `github_installations`: Unique constraint on `installation_id`

## Security Considerations

1. **GitHub App**: Uses JWT-based authentication, no long-lived tokens
2. **Webhook Verification**: HMAC SHA256 signature verification
3. **Private Repos**: All data stays server-side, never exposed to frontend without auth
4. **Rate Limits**: GitHub API rate limits handled via installation tokens (higher limits)

## Extensibility Points

1. **Activity Sources**: Easy to add new event types (issues, CI, tags)
2. **Summarization**: LLM provider is abstracted, can swap OpenAI for other providers
3. **Storage**: Activity events table allows debugging and alternative summarization approaches
4. **Scheduling**: Can extend to support custom schedules per repo

## Performance Considerations

1. **Rate Limiting**: Caps on fetched items (30 commits, 20 PRs max)
2. **Idempotency**: Syncs are safe to retry (unique constraints)
3. **Async Processing**: Backfills run asynchronously (could be queued in production)
4. **Database Indexes**: Key indexes on date, repo_id, status fields

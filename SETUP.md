# Quick Setup Guide

## 1. Database Setup

```bash
# Install dependencies
npm install

# Set up your .env file
cp .env.example .env
# Edit .env with your database URL and GitHub App credentials

# Generate Prisma client
npm run generate

# Run migrations
npm run migrate
```

## 2. GitHub App Configuration

### Create the GitHub App

1. Go to: https://github.com/settings/apps
2. Click "New GitHub App"
3. Fill in:
   - **GitHub App name**: Your app name
   - **Homepage URL**: Your app URL
   - **Webhook URL**: `https://yourdomain.com/webhooks/github`
   - **Webhook secret**: Generate a random secret (save it!)

### Set Permissions (all Read-only)

- Repository contents: Read (optional)
- Pull requests: Read
- Issues: Read
- Metadata: Read (required)
- Commit statuses: Read (optional)

### Subscribe to Webhook Events

- `installation`
- `installation_repositories`

### Get Credentials

After creating the app:

1. Copy the **App ID** (from General settings)
2. Generate and download the **Private key** (.pem file)
3. Copy the **Webhook secret** you generated earlier

### Add to .env

```env
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
-----END RSA PRIVATE KEY-----"
GITHUB_APP_WEBHOOK_SECRET=your_secret_here
```

**Important**: The private key should include the full PEM content with newlines. You can either:

- Put it in quotes with actual newlines
- Use `\n` to represent newlines (config.ts handles this automatically)

## 3. Run the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production
npm run build
npm start
```

## 4. Test Installation

1. Go to: https://github.com/settings/apps/YOUR_APP_NAME
2. Click "Install App"
3. Select an account/organization
4. Select repositories (or all)
5. Install

Your server should receive webhook events and automatically:

- Create client and installation records
- List repositories
- When repos are added, trigger 7-day backfill

## 5. Query Summaries

```bash
# Get all clients
curl http://localhost:3000/api/clients

# Get repos for a client
curl http://localhost:3000/api/clients/CLIENT_ID/repos

# Get summaries for a repo
curl http://localhost:3000/api/repos/REPO_ID/summaries

# Get summaries with date range
curl "http://localhost:3000/api/repos/REPO_ID/summaries?from=2024-01-01&to=2024-01-31"
```

## Troubleshooting

### Database Connection Issues

- Ensure PostgreSQL is running
- Check DATABASE_URL format: `postgresql://user:password@host:port/database?schema=public`
- Verify database exists

### GitHub App Issues

- Verify App ID is correct
- Check private key format (must include BEGIN/END lines)
- Ensure webhook URL is publicly accessible (use ngrok for local testing)
- Check GitHub App permissions are set correctly

### Webhook Not Receiving Events

- Verify webhook URL is correct in GitHub App settings
- Check webhook secret matches .env
- Ensure server is accessible (use ngrok for local development)
- Check server logs for incoming webhooks

### Local Development with Webhooks

Use ngrok to expose your local server:

```bash
# Install ngrok
brew install ngrok  # macOS
# or download from https://ngrok.com

# Expose local port
ngrok http 3000

# Use the ngrok URL as your webhook URL in GitHub App settings
# e.g., https://abc123.ngrok.io/webhooks/github
```

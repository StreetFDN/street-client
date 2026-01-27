# Testing Guide - Dev Update Engine

## Step 1: Install GitHub App on a Repository

### Install the App

1. Go to: `https://github.com/apps/dev-update-by-street-labs`
2. Click **"Install"**
3. Select an account/organization (e.g., StreetFDN)
4. Choose repositories:
   - Select **"Only select repositories"**
   - Pick 1-2 test repositories
5. Click **"Install"**

### What Should Happen

- GitHub sends webhook to your Railway deployment
- System creates client and installation records
- System creates repo records
- **7-day backfill automatically triggers**

---

## Step 2: Verify Installation (Check Database/API)

### Test 1: Health Check

```bash
curl https://street-client-production.up.railway.app/health
```

Expected response:

```json
{ "status": "ok", "timestamp": "2025-12-31T..." }
```

### Test 2: List Clients

```bash
curl https://street-client-production.up.railway.app/api/clients
```

Should return client records with installation info.

### Test 3: List Repos

```bash
# Get client ID from previous response, then:
curl https://street-client-production.up.railway.app/api/clients/{CLIENT_ID}/repos
```

Should show your installed repositories.

---

## Step 3: Check Railway Logs

1. Go to Railway → street-client service
2. Click **"Logs"** tab
3. Look for:
   - `"Received GitHub webhook: installation"` - App installed
   - `"Repo added: owner/repo"` - Repository connected
   - `"Starting backfill for repo..."` - Backfill started
   - `"✓ Backfilled..."` - Summaries being generated

---

## Step 4: Check Summaries

### Option A: Via API

```bash
# Get repo ID from /api/repos response, then:
curl https://street-client-production.up.railway.app/api/repos/{REPO_ID}/summaries
```

Should return daily summaries for the last 7 days.

### Option B: Check Specific Date Range

```bash
curl "https://street-client-production.up.railway.app/api/repos/{REPO_ID}/summaries?from=2024-12-24&to=2024-12-31"
```

---

## Step 5: Manual Testing (Optional)

### Trigger Manual Backfill

If you want to test without waiting:

1. Get repo ID from API
2. Call backfill endpoint:

```bash
curl -X POST https://street-client-production.up.railway.app/api/repos/{REPO_ID}/backfill
```

### Create Test Activity

To test with real activity:

1. Create a test PR in your repository
2. Merge it
3. Wait for next daily sync (2 AM UTC)
4. Or trigger manual sync via backfill

---

## Step 6: Verify LLM Summaries

After adding `OPENAI_API_KEY`:

1. Check logs for summary generation
2. Query summaries via API
3. Compare with template summaries (before LLM)

**LLM summaries should be:**

- More natural language
- Better structured
- More professional

**Template summaries look like:**

```
"2 pull requests merged, including "PR Title"."
```

**LLM summaries look like:**

```
"Development focused on [theme], with two pull requests merged addressing [key improvements]..."
```

---

## Quick Test Checklist

- [ ] GitHub App installed on repository
- [ ] Health endpoint returns OK
- [ ] Clients API returns data
- [ ] Repos API shows installed repos
- [ ] Logs show webhook events received
- [ ] Logs show backfill running
- [ ] Summaries API returns data
- [ ] Summaries contain activity (or "No changes")
- [ ] LLM summaries work (if key added)

---

## Troubleshooting

### No webhooks received?

- Check webhook URL in GitHub App settings
- Verify `GITHUB_APP_WEBHOOK_SECRET` matches
- Check Railway logs for errors

### No summaries?

- Check if backfill ran (look in logs)
- Verify repository has activity in last 7 days
- Check database connection
- Verify migrations ran successfully

### LLM not working?

- Verify `OPENAI_API_KEY` in Railway variables
- Check logs for OpenAI API errors
- Fallback to template should still work

---

## Expected Timeline

- **Immediately:** App installation → webhooks → records created
- **Within minutes:** 7-day backfill starts
- **Within 5-10 minutes:** Backfill completes, summaries generated
- **Daily:** New summaries at 2 AM UTC

---

## Test Endpoints Summary

```bash
# Health
GET /health

# Clients
GET /api/clients
GET /api/clients/{id}

# Repos
GET /api/clients/{clientId}/repos
GET /api/repos/{repoId}

# Summaries
GET /api/repos/{repoId}/summaries
GET /api/repos/{repoId}/summaries?from=2024-12-24&to=2024-12-31
GET /api/clients/{clientId}/summaries

# Manual triggers
POST /api/repos/{repoId}/backfill
```

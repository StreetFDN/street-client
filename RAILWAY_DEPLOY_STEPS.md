# Quick Railway Deployment Steps

## Step 1: Commit and Push to GitHub

```bash
# Add all files
git add .

# Commit
git commit -m "Initial commit - Dev Update Engine"

# Push to GitHub (make sure you've connected to the remote)
git push origin main
```

## Step 2: Deploy on Railway

### Option A: Via Railway Dashboard (Easiest)

1. **Go to Railway Dashboard**: https://railway.app
2. **Click "+ New Project"**
3. **Select "Deploy from GitHub repo"**
4. **Authorize Railway** (if first time)
5. **Select your repository**: `street-client`
6. **Railway will auto-detect** and start deploying

### Option B: Via Railway CLI

```bash
# Make sure you're logged in
railway login

# Link to new service (or use existing project)
railway init

# Deploy
railway up
```

## Step 3: Add Environment Variables

In Railway → Your Service → **Variables** tab, add:

```
DATABASE_URL=your_postgres_url_from_railway
GITHUB_APP_ID=(you'll get this from GitHub App registration)
GITHUB_APP_PRIVATE_KEY=(you'll get this from GitHub App registration)
GITHUB_APP_WEBHOOK_SECRET=(you'll generate this)
PORT=3000
NODE_ENV=production
OPENAI_API_KEY=(optional)
```

**Important:** You can add GitHub App credentials later - for now, just add:
- `DATABASE_URL` (copy from your Postgres service)
- `PORT=3000`
- `NODE_ENV=production`

## Step 4: Run Migrations

In Railway → Your Service → **Deployments** → Click your deployment → **Run Command**:

```bash
npm run migrate
```

Or use CLI:
```bash
railway run npm run migrate
```

## Step 5: Get Your Production URL

1. Railway will assign a URL like: `https://your-app.up.railway.app`
2. Go to your service → **Settings** → **Networking**
3. Copy the **public URL**
4. Your webhook URL will be: `https://your-app.up.railway.app/webhooks/github`

## Step 6: Complete GitHub App Registration

Now use your production webhook URL:
- **Webhook URL**: `https://your-app.up.railway.app/webhooks/github`
- Complete the GitHub App registration
- Add the credentials to Railway Variables

---

## Quick Checklist

- [ ] Code committed and pushed to GitHub
- [ ] Railway service created and deploying
- [ ] `DATABASE_URL` added to Railway variables
- [ ] `PORT=3000` and `NODE_ENV=production` added
- [ ] Migrations run successfully
- [ ] Production URL obtained
- [ ] Webhook URL ready for GitHub App
- [ ] GitHub App registered with production webhook URL
- [ ] GitHub App credentials added to Railway variables

# Production Deployment Guide - Railway

## Quick Deploy to Railway

### Option 1: Deploy via GitHub (Recommended)

1. **Push your code to GitHub:**

   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **In Railway:**
   - Go to your project
   - Click **"+ New"** → **"GitHub Repo"**
   - Select your `street-client` repository
   - Railway will auto-detect and deploy

3. **Add Environment Variables:**
   - In your Railway service, go to **"Variables"** tab
   - Add all variables from your `.env` file:
     - `DATABASE_URL` (already set if using Railway Postgres)
     - `GITHUB_APP_ID`
     - `GITHUB_APP_PRIVATE_KEY`
     - `GITHUB_APP_WEBHOOK_SECRET`
     - `OPENAI_API_KEY` (optional)
     - `PORT=3000`
     - `NODE_ENV=production`

4. **Run Migrations:**
   - Go to **"Deployments"** tab
   - Click on your deployment
   - Click **"Run Command"** or use Railway CLI:
     ```bash
     railway run npm run migrate
     ```

5. **Get Your Production URL:**
   - Railway will generate a URL like: `https://your-app.up.railway.app`
   - Your webhook URL will be: `https://your-app.up.railway.app/webhooks/github`

---

### Option 2: Deploy via Railway CLI

1. **Link your project:**

   ```bash
   railway link
   ```

2. **Set environment variables:**

   ```bash
   railway variables set GITHUB_APP_ID=your_app_id
   railway variables set GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
   railway variables set GITHUB_APP_WEBHOOK_SECRET=your_secret
   railway variables set DATABASE_URL="your_database_url"
   railway variables set PORT=3000
   railway variables set NODE_ENV=production
   ```

3. **Deploy:**

   ```bash
   railway up
   ```

4. **Run migrations:**
   ```bash
   railway run npm run migrate
   ```

---

## Environment Variables Setup

### Required Variables

Add these to Railway → Your Service → Variables:

```env
DATABASE_URL=your_railway_postgres_url
GITHUB_APP_ID=your_app_id
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_APP_WEBHOOK_SECRET=your_webhook_secret
PORT=3000
NODE_ENV=production
```

### Optional Variables

```env
OPENAI_API_KEY=your_openai_key
BASE_URL=https://your-app.up.railway.app
```

---

## Get Your Production Webhook URL

After deployment:

1. Railway will show your app URL: `https://your-app.up.railway.app`
2. Your webhook URL: `https://your-app.up.railway.app/webhooks/github`
3. Use this in GitHub App registration!

---

## After Deployment Checklist

- [ ] Code pushed to GitHub (if using GitHub deploy)
- [ ] Railway service created
- [ ] Environment variables added
- [ ] Migrations run (`railway run npm run migrate`)
- [ ] Service is running and healthy
- [ ] Production URL obtained
- [ ] Webhook URL configured in GitHub App
- [ ] Test webhook works (check Railway logs)

---

## Troubleshooting

### Deployment fails

- Check build logs in Railway
- Ensure all dependencies are in `package.json`
- Verify Node.js version (18+)

### Database connection fails

- Check `DATABASE_URL` is correct
- Ensure migrations have run
- Verify Railway Postgres service is running

### Webhook not receiving events

- Verify webhook URL is correct: `https://your-app.up.railway.app/webhooks/github`
- Check Railway logs for incoming requests
- Verify `GITHUB_APP_WEBHOOK_SECRET` matches GitHub App settings

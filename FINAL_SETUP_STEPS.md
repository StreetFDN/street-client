# Final Setup Steps

## ✅ Completed
- [x] GitHub OAuth App created
- [x] Code changes implemented
- [x] Database migration created locally

## 🚀 Remaining Steps

### Step 1: Add OAuth Credentials to Railway

Go to Railway → street-client service → Variables tab, and add:

1. **GITHUB_CLIENT_ID**
   - Value: Your OAuth App Client ID (from GitHub)

2. **GITHUB_CLIENT_SECRET**
   - Value: Your OAuth App Client Secret (from GitHub)

3. **SESSION_SECRET**
   - Generate a random secret:
   ```bash
   openssl rand -hex 32
   ```
   - Copy the output and use it as the value

### Step 2: Commit & Push Code

```bash
git add .
git commit -m "Add GitHub OAuth authentication with user-scoped data"
git push origin main
```

Railway will automatically deploy the changes.

### Step 3: Run Migration on Railway

After deployment, run the migration in Railway:

1. Railway → street-client → Deployments tab
2. Click latest deployment
3. Find "Run Command" or "Terminal" button
4. Run: `npm run migrate:deploy`

This creates the `User` table and adds `userId` to `Client` table.

### Step 4: Test Login Flow

1. Visit: `https://street-client-production.up.railway.app`
2. You should see a "Login with GitHub" button
3. Click it and authorize
4. Should redirect back and show your repositories (if GitHub App is installed)

---

## 🎉 You're Done!

After these steps, your system will be fully functional with:
- ✅ User authentication
- ✅ Protected routes
- ✅ User-specific data
- ✅ Beautiful frontend
- ✅ Daily summaries

---

## Troubleshooting

**"GitHub OAuth not configured"**
- Check all three variables are set in Railway
- Make sure variable names are exact (case-sensitive)

**"Invalid state parameter"**
- Clear cookies and try again
- Check SESSION_SECRET is set

**No repositories showing**
- Make sure GitHub App is installed on your repositories
- Check Railway logs for webhook events
- Verify installation in GitHub App settings

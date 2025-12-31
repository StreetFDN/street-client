# Testing Authentication

## Quick Test Steps

### 1. Visit Your Site

Open in browser:
```
https://street-client-production.up.railway.app
```

### 2. What You Should See

**If authentication is NOT configured yet:**
- You'll see an error message (check browser console)
- Or a generic error page

**If authentication IS configured:**
- You should see a login page with:
  - "Welcome to Dev Update Engine" heading
  - "Login with GitHub" button

### 3. Test Login Flow

1. Click **"Login with GitHub"** button
2. You'll be redirected to GitHub
3. Authorize the application
4. GitHub redirects you back
5. You should see:
   - Your GitHub avatar and name in the header
   - Your repositories (if GitHub App is installed)
   - Or a message to install the GitHub App

### 4. Check Railway Logs

If something doesn't work:

1. Railway → street-client → **Logs** tab
2. Look for:
   - Migration output (should show migration ran successfully)
   - Server startup messages
   - Any error messages

---

## Expected Behavior

### Before Login
- Shows login prompt
- Cannot access any data

### After Login
- Shows user info (avatar, name)
- Shows repositories (if any)
- Shows summaries (if any)
- Can logout

---

## Troubleshooting

### "GitHub OAuth not configured"
- Check Railway Variables:
  - `GITHUB_CLIENT_ID` is set
  - `GITHUB_CLIENT_SECRET` is set
  - `SESSION_SECRET` is set
- Redeploy if you just added them

### "Invalid redirect URI"
- Check OAuth App callback URL in GitHub:
  - Should be exactly: `https://street-client-production.up.railway.app/api/auth/github/callback`

### No repositories showing
- Install GitHub App on repositories first:
  - Go to: https://github.com/apps/dev-update-by-street-labs
  - Click "Install"
  - Select repositories

### Migration errors in logs
- Check Railway logs for migration output
- If migration failed, you may need to run it manually

---

## Quick Checklist

- [ ] Variables added to Railway (GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, SESSION_SECRET)
- [ ] Deployment successful (green checkmark)
- [ ] Visit site: https://street-client-production.up.railway.app
- [ ] See login page
- [ ] Click "Login with GitHub"
- [ ] Authorize on GitHub
- [ ] Redirected back successfully
- [ ] See user info in header
- [ ] (Optional) Install GitHub App to see repositories

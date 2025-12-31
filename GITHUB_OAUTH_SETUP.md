# GitHub OAuth Setup Guide

## Overview

The frontend now requires GitHub OAuth login. Users must log in with GitHub to view their repository summaries.

## Setup Steps

### 1. Get GitHub OAuth Credentials

You need to create an OAuth App (separate from your GitHub App):

1. Go to: https://github.com/settings/developers
2. Click **"New OAuth App"**
3. Fill in:
   - **Application name**: `Dev Update Engine` (or any name)
   - **Homepage URL**: `https://street-client-production.up.railway.app`
   - **Authorization callback URL**: `https://street-client-production.up.railway.app/api/auth/github/callback`
4. Click **"Register application"**
5. Copy:
   - **Client ID** (shown immediately)
   - **Client Secret** (click "Generate a new client secret" if needed)

### 2. Add to Railway Variables

Add these to Railway → street-client → Variables:

- `GITHUB_CLIENT_ID` = Your OAuth App Client ID
- `GITHUB_CLIENT_SECRET` = Your OAuth App Client Secret  
- `SESSION_SECRET` = Random secret string (use: `openssl rand -hex 32`)

### 3. Update BASE_URL (if needed)

Make sure `BASE_URL` in Railway is set to:
```
https://street-client-production.up.railway.app
```

---

## How It Works

1. User clicks "Login with GitHub"
2. Redirects to GitHub OAuth
3. User authorizes
4. GitHub redirects back to `/api/auth/github/callback`
5. System creates/updates user in database
6. Session is created
7. User sees their repositories and summaries

---

## Linking Users to Installations

When a GitHub App is installed:
- System looks for user with matching `githubLogin`
- If found, links the client/installation to that user
- If not found, creates client without user (will link when user logs in)

---

## Security Notes

- Sessions are stored server-side
- Cookies are httpOnly and secure (in production)
- OAuth state parameter prevents CSRF
- Access tokens stored in database (should be encrypted in production)

---

## Testing

1. Visit: `https://street-client-production.up.railway.app`
2. Click "Login with GitHub"
3. Authorize the app
4. Should see your repositories (if GitHub App is installed)

---

## Troubleshooting

**"GitHub OAuth not configured"**
- Check `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set in Railway

**Redirect URI mismatch**
- Make sure callback URL in GitHub OAuth App matches exactly: `https://street-client-production.up.railway.app/api/auth/github/callback`

**Session not persisting**
- Check `SESSION_SECRET` is set
- In production, cookies require HTTPS (Railway provides this)

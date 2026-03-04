# GitHub App Registration - Step by Step Guide

## What You're Setting Up

This guide helps you configure your GitHub App for the Dev Update Engine.

---

## 1. Webhook Section

### Webhook URL

**For local development:**

- Use ngrok to expose your local server: `ngrok http 3000`
- Copy the ngrok URL and add `/webhooks/github` at the end
- Example: `https://abc123.ngrok.io/webhooks/github`

**For production:**

- Your production URL + `/webhooks/github`
- Example: `https://yourdomain.com/webhooks/github`

### Webhook Secret

- Generate a random secret (you can use: `openssl rand -hex 32`)
- Save this! You'll add it to your `.env` file as `GITHUB_APP_WEBHOOK_SECRET`
- Example secret: `a1b2c3d4e5f6...` (long random string)

**Important:**

- ✅ Check "Active" (should already be checked)
- Copy the secret and save it - you'll need it for `.env`

---

## 2. Repository Permissions (CRITICAL!)

Set these to **Read-only**:

- **Metadata**: Read (REQUIRED)
- **Pull requests**: Read
- **Issues**: Read (optional but recommended)
- **Repository contents**: Read (optional - only needed if you want commit details)
- **Commit statuses**: Read (optional - for CI summary)

**DO NOT** grant Write permissions - we only need read access!

---

## 3. Subscribe to Events

Check these webhook events:

- ✅ **Installation** (REQUIRED - for when app is installed/uninstalled)
- ✅ **Installation repositories** (REQUIRED - for when repos are added/removed)

You can also subscribe to (optional):

- Pull request
- Push (if you want real-time updates, but daily polling works fine)

**For v1, you only NEED:**

- Installation
- Installation repositories

---

## 4. Where Events Are Sent

This should be automatically set to your Webhook URL from step 1.

---

## 5. After Creating the App

Once you create the app, GitHub will show you:

1. **App ID** - Copy this, add to `.env` as `GITHUB_APP_ID`
2. **Generate Private Key** - Click "Generate a private key"
   - Download the `.pem` file
   - Copy the entire contents (including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`)
   - Add to `.env` as `GITHUB_APP_PRIVATE_KEY`

---

## Quick Checklist

- [ ] Webhook URL set (ngrok URL for local dev)
- [ ] Webhook secret generated and saved
- [ ] Repository permissions set to Read-only
- [ ] Installation event subscribed
- [ ] Installation repositories event subscribed
- [ ] App created
- [ ] App ID copied
- [ ] Private key downloaded
- [ ] All values added to `.env` file

---

## Local Development Setup (ngrok)

If testing locally, you need to expose your server:

```bash
# Install ngrok
brew install ngrok
# or download from https://ngrok.com

# Start your server
npm run dev

# In another terminal, expose port 3000
ngrok http 3000

# Copy the https URL (e.g., https://abc123.ngrok.io)
# Add /webhooks/github: https://abc123.ngrok.io/webhooks/github
# Use this as your Webhook URL in GitHub App settings
```

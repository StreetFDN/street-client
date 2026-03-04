# Add GitHub App Credentials to Railway

## Step-by-Step Guide

### Step 1: Generate Private Key (On GitHub)

1. On the GitHub App page, click **"Generate a private key"** button
2. GitHub will generate and download a `.pem` file
3. **Save this file** - you'll need its contents

### Step 2: Get Your Credentials

From the GitHub App page, you need:

- **App ID**: `2570214` ✅ (already visible)
- **Private Key**: Contents of the `.pem` file you downloaded
- **Webhook Secret**:
  - Go to **"Permissions & events"** in the left sidebar
  - Scroll to **"Webhook"** section
  - Copy the webhook secret you entered earlier

### Step 3: Add to Railway Variables

1. Go to Railway → **street-client** service
2. Click **"Variables"** tab
3. Click **"+ New Variable"**

Add these three variables:

**Variable 1:**

```
Name: GITHUB_APP_ID
Value: 2570214
```

**Variable 2:**

```
Name: GITHUB_APP_PRIVATE_KEY
Value: -----BEGIN RSA PRIVATE KEY-----
(paste entire contents of .pem file here, all lines)
-----END RSA PRIVATE KEY-----
```

**Important:** Copy the ENTIRE private key, including:

- `-----BEGIN RSA PRIVATE KEY-----`
- All the encoded lines in between
- `-----END RSA PRIVATE KEY-----`

**Variable 3:**

```
Name: GITHUB_APP_WEBHOOK_SECRET
Value: (your webhook secret from GitHub)
```

### Step 4: Run Migrations

After adding variables, Railway will auto-redeploy. Then:

1. Go to Railway → street-client → **Deployments** tab
2. Click on your latest deployment
3. Click **"Run Command"** or use the terminal
4. Run: `npm run migrate`

This creates all database tables.

---

## Quick Checklist

- [ ] Private key downloaded from GitHub
- [ ] App ID copied: `2570214`
- [ ] Webhook secret copied from GitHub
- [ ] `GITHUB_APP_ID` added to Railway
- [ ] `GITHUB_APP_PRIVATE_KEY` added to Railway (full PEM content)
- [ ] `GITHUB_APP_WEBHOOK_SECRET` added to Railway
- [ ] Migrations run: `npm run migrate`
- [ ] Service redeployed successfully

---

## After This

Once credentials are added and migrations are run, you're ready to:

1. Install the GitHub App on repositories
2. Webhooks will start working
3. System will automatically track repos and generate summaries

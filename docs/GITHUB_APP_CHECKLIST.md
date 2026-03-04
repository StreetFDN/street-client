# GitHub App Registration - Final Checklist

## ✅ What You've Done

- [x] Webhook URL: `https://street-client-production.up.railway.app/webhooks/github`

## 🔴 REQUIRED Before Creating App

### 1. Generate Webhook Secret

- Click in the **"Secret"** input field
- Generate a random secret (you can use: `openssl rand -hex 32` in terminal, or use a password generator)
- **SAVE THIS SECRET!** You'll need to add it to Railway variables
- Paste it into the Secret field

### 2. Set Repository Permissions (Click on "Repository permissions" to expand)

Set these to **Read-only**:

- ✅ **Metadata**: Read (REQUIRED - must have this)
- ✅ **Pull requests**: Read
- ✅ **Issues**: Read (recommended)
- ✅ **Repository contents**: Read (optional but recommended)
- ✅ **Commit statuses**: Read (optional)

**IMPORTANT:** Make sure they're all set to **"Read"** (not Write or No access)

### 3. Subscribe to Events (Click on "Subscribe to events" to expand)

Check these checkboxes:

- ✅ **Installation** (REQUIRED)
- ✅ **Installation repositories** (REQUIRED)

Optional (you can skip for now):

- Pull request
- Push

### 4. SSL Verification

- Keep **"Enable SSL verification"** selected (default) ✅

---

## 📋 Quick Checklist

Before clicking "Create GitHub App", make sure:

- [x] Webhook URL entered: `https://street-client-production.up.railway.app/webhooks/github`
- [ ] **Webhook Secret generated and entered** ⚠️
- [ ] **Repository permissions set to Read-only** ⚠️
  - [ ] Metadata: Read
  - [ ] Pull requests: Read
  - [ ] Issues: Read (recommended)
- [ ] **Events subscribed** ⚠️
  - [ ] Installation
  - [ ] Installation repositories
- [ ] SSL verification enabled ✅ (should be default)

---

## After Creating the App

1. **Copy App ID** (you'll see it on the next page)
2. **Generate Private Key** (click "Generate a private key" button)
3. **Download the .pem file**
4. **Add to Railway Variables:**
   - `GITHUB_APP_ID` = (the App ID)
   - `GITHUB_APP_PRIVATE_KEY` = (full content of .pem file)
   - `GITHUB_APP_WEBHOOK_SECRET` = (the secret you generated above)

---

**Most Important:** Don't forget the Webhook Secret - generate it now and save it!

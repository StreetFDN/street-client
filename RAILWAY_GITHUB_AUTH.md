# Railway GitHub Repository Not Showing

## Issue: Repository not appearing in Railway

## Solutions:

### Option 1: Authorize Railway to Access GitHub

1. On the Railway "Deploy Repository" page, look for **"Configure GitHub App"** (should be visible)
2. Click on **"Configure GitHub App"**
3. This will take you to GitHub to authorize Railway
4. Select the organization/account that owns `street-client` repository
5. Authorize Railway to access your repositories
6. Go back to Railway and try again - your repos should now appear

### Option 2: Search for Your Repository

1. In the search box "What would you like to deploy today?"
2. Type: `StreetFDN/street-client`
3. It should appear in the search results
4. Click on it to select

### Option 3: Manual Connection

If it still doesn't show:

1. Click **"Configure GitHub App"** first
2. Make sure Railway has access to **StreetFDN** organization
3. Try searching again: `StreetFDN/street-client`

### Option 4: Check Repository Visibility

Make sure:

- Repository exists: https://github.com/StreetFDN/street-client
- You have access to the StreetFDN organization
- Railway is authorized to access StreetFDN's repositories

---

## Quick Steps:

1. **Click "Configure GitHub App"** (on the Railway page)
2. **Authorize Railway** for StreetFDN organization
3. **Go back to Railway**
4. **Search for:** `StreetFDN/street-client`
5. **Select it** and deploy!

---

## If Still Not Working:

Try refreshing the page or:

1. Go to Railway Dashboard
2. Click "+ New"
3. Select "Empty Project"
4. Then click "+ New" in the project
5. Select "GitHub Repo"
6. Authorize if prompted
7. Search for `street-client`

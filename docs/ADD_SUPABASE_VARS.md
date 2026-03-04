# Adding Supabase Environment Variables to Railway

## Step 1: Get Your Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and sign in
2. Select your project (or create a new one if needed)
3. In the left sidebar, click **Settings** (gear icon)
4. Click **API** in the settings menu
5. You'll see two values you need:
   - **Project URL** - This is your `SUPABASE_URL`
     - Format: `https://xxxxx.supabase.co`
     - Copy this entire URL
   - **anon public** key - This is your `SUPABASE_ANON_KEY`
     - It's a long string starting with `eyJ...`
     - Click the "Reveal" button or copy icon to copy it

## Step 2: Add to Railway

### Option A: Via Railway Dashboard (Recommended)

1. Go to [railway.app](https://railway.app)
2. Sign in and select your project
3. Click on your **street-client** service
4. Click on the **Variables** tab
5. Click **+ New Variable** button
6. Add the first variable:
   - **Name**: `SUPABASE_URL`
   - **Value**: Paste your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
   - Click **Add**
7. Click **+ New Variable** again
8. Add the second variable:
   - **Name**: `SUPABASE_ANON_KEY`
   - **Value**: Paste your anon public key (the long JWT token)
   - Click **Add**

### Option B: Via Railway CLI

If you prefer using the CLI:

```bash
# Set SUPABASE_URL
railway variables set SUPABASE_URL="https://your-project.supabase.co"

# Set SUPABASE_ANON_KEY
railway variables set SUPABASE_ANON_KEY="your-anon-key-here"
```

**Note**: Make sure you're in the correct project:

```bash
railway link  # Link to your project if needed
railway variables  # List current variables
```

## Step 3: Verify

After adding the variables:

1. Railway will automatically redeploy your service
2. Check the deployment logs to ensure it starts successfully
3. You can verify variables are set by going to Variables tab in Railway dashboard

## Step 4: Test

Once deployed, test the authentication:

```bash
# Test with a Supabase JWT token
curl -H "Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN" \
     https://street-client-production.up.railway.app/api/clients
```

## Troubleshooting

- **Can't find API settings**: Make sure you're in the correct Supabase project
- **Variables not showing**: Refresh the Railway dashboard
- **Service not restarting**: Check the Railway deployment logs
- **Authentication failing**: Verify the anon key is correct (no extra spaces/characters)

## Security Note

The `SUPABASE_ANON_KEY` is safe to use in client-side code and environment variables. It's designed to be public. However, make sure you have Row Level Security (RLS) policies set up in Supabase to protect your data.

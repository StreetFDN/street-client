# Fix: Invalid OpenAI API Key

## Problem

The logs show:

```
[Aggregate Summary] Error generating LLM summary: AuthenticationError: 401 Incorrect API key provided
```

The OpenAI API key in Railway is invalid or expired, causing the system to fall back to generic template summaries.

## Solution

### Update OpenAI API Key in Railway

1. **Get a valid OpenAI API key:**
   - Go to https://platform.openai.com/account/api-keys
   - Create a new API key or copy an existing valid one
   - Make sure it starts with `sk-proj-` or `sk-`

2. **Update in Railway:**
   - Go to Railway dashboard → Your `street-client` service
   - Click on **Variables** tab
   - Find `OPENAI_API_KEY`
   - Click to edit
   - Paste the new valid API key
   - Save

3. **Verify:**
   - Railway will automatically redeploy
   - After deployment, trigger a sync
   - Check logs - you should see successful LLM generation instead of the 401 error

## What's Working

✅ Activity events are being stored (100 events found)  
✅ Activity is being grouped correctly (1 PR, 99 commits)  
✅ The code is trying to use the LLM  
❌ The API key is invalid → falling back to generic template

## After Fix

Once you update the API key, the summaries should be specific and include actual PR titles and concrete changes instead of generic "Progress across X repositories: Y pull requests merged."

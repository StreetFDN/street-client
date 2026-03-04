# Add OpenAI API Key to Railway

## Steps to Enable LLM Summaries

1. **Go to Railway Dashboard**
   - Navigate to your **street-client** service
   - Click the **"Variables"** tab

2. **Add New Variable**
   - Click **"+ New Variable"**
   - **Name:** `OPENAI_API_KEY`
   - **Value:** `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`

3. **Save & Redeploy**
   - Railway will automatically redeploy with the new variable
   - Or click "Deploy" to trigger a new deployment

4. **Result**
   - System will now use GPT-4o-mini for summaries
   - Summaries will be more natural and professional
   - Template fallback still works if LLM fails

---

## What Changes

**Before (Template-based):**

```
"3 pull requests merged, including "Fix user authentication bug"."
```

**After (LLM-powered):**

```
"Development focused on authentication improvements, with three pull requests merged including fixes for user authentication bugs and related security enhancements."
```

---

## Security Note

✅ Your API key is now stored securely in Railway's environment variables  
✅ It won't be exposed in code or logs  
✅ Only your application can access it

---

## Testing

After adding the key and redeploying, the next daily sync (2 AM UTC) will use LLM summaries, or you can manually trigger a backfill to test immediately.

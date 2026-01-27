# How the System Tracks Activity Without LLM

## Summary Generation (No LLM Required!)

The system has **two modes** for generating summaries:

### 1. **With LLM** (if `OPENAI_API_KEY` is set)

- Uses OpenAI GPT-4o-mini to generate professional summaries
- Creates natural language paragraphs

### 2. **Without LLM - Template-Based Fallback** (current mode)

- Uses a **template-based approach** - no LLM needed!
- Automatically formats activity data into readable summaries

---

## How It Works (Template Mode)

When `OPENAI_API_KEY` is not set, the system uses `generateSummaryFallback()`:

### What It Tracks:

1. **Merged Pull Requests** - Count + first PR title
2. **Releases** - Count + first release name
3. **Commits** - Count (only if no PRs/releases)

### Example Output:

**With activity:**

```
"3 pull requests merged, including "Fix user authentication bug", 1 release published, including "v2.1.0"."
```

**Without activity:**

```
"No relevant GitHub changes in the last 24h."
```

---

## The Full Tracking Process

1. **Fetch Activity** (via GitHub API)
   - Gets merged PRs from last 24h
   - Gets releases from last 24h
   - Gets commits (fallback if no PRs/releases)

2. **Store Raw Events** (in database)
   - All events stored in `repo_activity_events` table
   - Includes: type, title, URL, author, timestamps

3. **Generate Summary** (template-based)
   - Counts activity
   - Formats into readable text
   - Includes key details (first PR/release title)

4. **Store Summary** (in database)
   - Daily summary stored in `repo_daily_summaries` table
   - Includes stats JSON (counts)
   - Marked as "no_changes" if empty

---

## What You Get Without LLM

✅ **Activity Tracking** - All events recorded  
✅ **Daily Summaries** - Template-based summaries  
✅ **Counts & Stats** - Numbers and key details  
✅ **URLs & Links** - Direct links to PRs/releases  
✅ **"No Changes" Detection** - Clear messaging when quiet

**Example Summary:**

```
"2 pull requests merged, including "Add dark mode support", 5 commits."
```

---

## Adding LLM (Optional)

To enable LLM summaries, just add to Railway Variables:

```
OPENAI_API_KEY=sk-your-key-here
```

Then summaries become more natural:

```
"Development focused on UI improvements, with dark mode support added and several bug fixes merged."
```

---

## Bottom Line

**The system works perfectly without LLM!** It:

- ✅ Tracks all GitHub activity
- ✅ Stores events in database
- ✅ Generates template-based summaries
- ✅ Provides counts, titles, and URLs
- ✅ Works for "founder doesn't post, investors still see a heartbeat"

The LLM just makes summaries _more natural_ - but template summaries are still informative and useful!

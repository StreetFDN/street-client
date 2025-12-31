# GitHub App Events - Which Ones to Check

## Required Events

You need to check **ONLY** these two events:

### 1. ✅ Installation
- **Purpose:** Detects when your GitHub App is installed or uninstalled
- **What it does:** Creates/deletes client and installation records in your database
- **Required:** YES

### 2. ✅ Installation repositories  
- **Purpose:** Detects when repositories are added or removed from an installation
- **What it does:** Creates repo records and triggers 7-day backfill for newly added repos
- **Required:** YES

---

## Optional Events (You Can Skip These)

All other events are **optional** for v1. You don't need:
- ❌ Pull request
- ❌ Push
- ❌ Issues
- ❌ Release
- ❌ Repository
- ❌ Any others

**Why?** Your system polls GitHub daily via the API, so you don't need real-time webhooks for individual PR/push events.

---

## Quick Answer

**Check ONLY:**
1. ✅ **Installation**
2. ✅ **Installation repositories**

**Uncheck everything else.**

---

## Where to Find These Events

If you don't see "Installation" or "Installation repositories" in the list, they might be:
- In a different section (scroll up/down)
- Grouped under a different category
- Listed near the top of the events list

These are core GitHub App events, so they should be available. If you can't find them, they might already be auto-selected, or GitHub might require them for GitHub Apps.

# Frontend - Dev Update Engine Dashboard

## Overview

A simple, modern web interface to view GitHub activity summaries.

## Features

- 📊 View all clients and repositories
- 📅 Browse daily summaries with dates
- 📈 See activity stats (PRs, releases, commits)
- 🎨 Clean, modern UI with gradient design
- 🔄 Auto-refreshes every 5 minutes
- 📱 Responsive design

## Access

Once deployed, visit:
```
https://street-client-production.up.railway.app
```

The frontend is served at the root path, and automatically loads all clients, repos, and summaries.

## How It Works

1. Frontend makes API calls to `/api/*` endpoints
2. Displays clients → repos → summaries in a card-based layout
3. Shows activity stats and dates
4. Handles empty states gracefully

## UI Components

- **Client Cards**: Show client name and repo count
- **Repo Cards**: Display repo info and summaries
- **Summary Cards**: Show date, summary text, and activity stats
- **Empty States**: Friendly messages when no data

## Customization

Edit `public/index.html` to customize:
- Colors (CSS variables in `<style>` tag)
- Layout and spacing
- Auto-refresh interval (currently 5 minutes)

---

The frontend is a single HTML file with embedded CSS and JavaScript - no build step needed!

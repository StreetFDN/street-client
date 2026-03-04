# Quick Commands Reference

## Navigate to Project

```bash
cd /Users/lukasgruber/street-client
```

## Start Development Server

```bash
npm run dev
```

## Generate Prisma Client

```bash
npm run generate
```

## Run Migrations

```bash
npm run migrate
```

## Available Scripts

```bash
npm run build    # Build TypeScript
npm run dev      # Start dev server with auto-reload
npm run start    # Start production server
npm run migrate  # Run database migrations
npm run generate # Generate Prisma client
npm run studio   # Open Prisma Studio (database GUI)
```

## Start Server for GitHub App Testing

1. **Terminal 1 - Start Server:**

   ```bash
   cd /Users/lukasgruber/street-client
   npm run dev
   ```

2. **Terminal 2 - Start ngrok (for webhook):**
   ```bash
   ngrok http 3000
   ```
   Copy the https URL (e.g., `https://abc123.ngrok.io`) and use:
   `https://abc123.ngrok.io/webhooks/github` as your GitHub App webhook URL

---

## Important: Always Run Commands from Project Directory!

Make sure you're in `/Users/lukasgruber/street-client` before running npm commands.

# Railway - Check Variables Tab

Railway often provides a ready-to-use connection string in the Variables tab!

## How to Get It

1. In Railway, click on your **Postgres** service
2. Click on the **"Variables"** tab (in the service navigation)
3. Look for:
   - **"DATABASE_URL"**
   - **"POSTGRES_URL"**
   - **"POSTGRES_PRIVATE_URL"**
   - **"POSTGRES_PUBLIC_URL"**

Railway usually auto-generates these with the correct connection details!

## If You Find It

Just copy that DATABASE_URL value and update your `.env` file. It should already have the right format.

## Current Connection String We're Using

Based on what you showed me, we're using:

```
postgresql://postgres:PASSWORD@tramway.proxy.rlwy.net:45858/railway?schema=public
```

But if Railway has a DATABASE_URL variable, use that instead - it's usually pre-configured correctly!

## CoinGecko

1. Obtain an API key from CoinGecko (Analyst plan or higher) at:
   [https://www.coingecko.com/en/api/pricing](https://www.coingecko.com/en/api/pricing)

2. The same API key can be used for both local and production environments. There is no need to generate separate keys.

---

## Twitter (X)

1. Create a developer account at X Developer Console:
   [https://console.x.com/](https://console.x.com/)

2. Create a new application at:
   `https://console.x.com/accounts/<TWITTER_ACCOUNT_ID>/apps`

3. Collect the following credentials and store them as environment variables:
   - Consumer Key
   - Consumer Key Secret
   - Access Token
   - Access Token Secret

---

# Setting Up Authentication

### 1. Create a GitHub OAuth App

1. Go to GitHub OAuth app settings:
   [https://github.com/settings/applications/new](https://github.com/settings/applications/new)

2. Create a new OAuth application:
   - **Application URL**:
     - `http://localhost:3000` (local)
     - `<FRONTEND_URL>` (production)

   - **Callback URL**: Use a temporary placeholder for now (you will update this later from Supabase).

3. After creating the app, save the:
   - Client ID
   - Client Secret

---

### 2. Create a Supabase Project

1. Go to Supabase and create a new project.

2. Retrieve the following credentials (for environment variables):
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_ANON_KEY`

---

### 3. Configure Supabase Authentication

1. Navigate to:
   `https://supabase.com/dashboard/project/<PROJECT_ID>/auth/providers` or the Auth section in Supabase project.

2. Enable:
   - **Allow new users to sign up**
   - **Confirm email**

---

### 4. Enable GitHub Provider in Supabase

1. In Supabase, go to:
   `https://supabase.com/dashboard/project/<PROJECT_ID>/auth/providers?provider=GitHub` (or just click Github from the list of providers)

2. Enable **GitHub** as an authentication provider.

3. Enter the **Client ID** and **Client Secret** from your GitHub OAuth app.

4. Supabase will display a **Callback URL**.
   - Copy this URL.
   - Go back to your GitHub OAuth app settings (`https://github.com/settings/developers`).
   - Replace the existing callback URL with the one provided by Supabase.

---

### 5. Configure Site URL in Supabase

1. Go to:
   `https://supabase.com/dashboard/project/<PROJECT_ID>/auth/url-configuration`

2. Set the **Site URL**:
   - `http://localhost:3000` (local setup)
   - `<FRONTEND_URL>` (production setup)

---

### Important Notes

- Use separate Supabase projects and GitHub OAuth apps for **local** and **production** environments.
- Keep all credentials secure and store them in environment variables.

---

## Setting Up GitHub App & Webhooks for Installations

**TODO**

---

## Running the Street Client

1. Run `cp .env.example .env` to create an env file.
2. Fill up the env variables, with the following values (values are for local setup, fill up appropriately for the prod version):

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mydb

// Fetch from Github App (not the OAuth app)
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_APP_WEBHOOK_SECRET=

// From OpenAI, for Summary Generation (we still generate summaries with a simple template even without this API Key)
OPENAI_API_KEY=

COINGECKO_API_KEY=
REDIS_URL=redis://localhost:6379

// from supabase (required)
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_ANON_KEY=

// These users can create clients, and access all clients' dashboards
ADMIN_SUPERUSER_EMAIL=<EMAIL_1>,<EMAIL_2>,<EMAIL_3>...

// from twitter
X_API_CONSUMER_KEY=
X_API_CONSUMER_SECRET=
X_API_TOKEN_KEY=
X_API_TOKEN_SECRET=

CLIENT_DASHBOARD_FE_URL=http://localhost:3000
```

3. `npm install` the dependencies.
4. Start the DB and Redis instance locally with `docker compose -f docker-compose.dev.yml up -d`
5. Run migrations with `npx prisma db push` (only once)
6. Start the app with `npm run dev`

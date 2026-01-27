# Authentication Features Added

## What's New

✅ **GitHub OAuth Login** - Users log in with GitHub  
✅ **Protected Routes** - API endpoints require authentication  
✅ **User-Scoped Data** - Users only see their own repositories  
✅ **Session Management** - Secure server-side sessions  
✅ **Frontend Login** - Beautiful login UI

---

## Database Changes

### New `User` Model

- Stores GitHub user information
- Links to clients via `userId` field

### Updated `Client` Model

- Added optional `userId` field
- Links clients to authenticated users

---

## API Changes

### New Endpoints

- `GET /api/auth/github` - Initiate OAuth login
- `GET /api/auth/github/callback` - OAuth callback handler
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - Logout

### Protected Endpoints (Now Require Auth)

- `GET /api/clients` - Only shows user's clients
- `GET /api/clients/:id` - Only if client belongs to user
- `GET /api/clients/:id/repos` - Only user's repos
- `GET /api/repos/:id` - Only user's repos
- `GET /api/clients/:id/repos/:repoId/summaries` - Only user's summaries

---

## Frontend Changes

- **Login Page** - Shows when not authenticated
- **User Info** - Displays GitHub avatar and name
- **Logout Button** - Logs out and clears session
- **Protected Content** - Only shows data after login

---

## Setup Required

1. **Create GitHub OAuth App** (separate from GitHub App)
   - Go to: https://github.com/settings/developers
   - Create new OAuth App
   - Set callback URL: `https://street-client-production.up.railway.app/api/auth/github/callback`

2. **Add to Railway Variables**
   - `GITHUB_CLIENT_ID` - OAuth App Client ID
   - `GITHUB_CLIENT_SECRET` - OAuth App Client Secret
   - `SESSION_SECRET` - Random secret (generate with `openssl rand -hex 32`)

3. **Run Migration**
   ```bash
   npm run migrate:deploy
   ```

See `GITHUB_OAUTH_SETUP.md` for detailed setup instructions.

---

## How It Works

1. User visits frontend
2. If not logged in → Shows login page
3. User clicks "Login with GitHub"
4. Redirects to GitHub OAuth
5. User authorizes
6. GitHub redirects back with code
7. Backend exchanges code for token
8. Backend fetches user info from GitHub
9. Creates/updates user in database
10. Creates session
11. Redirects to frontend
12. Frontend shows user's repositories and summaries

---

## User-Installation Linking

When GitHub App is installed:

- System looks for user with matching `githubLogin`
- If found → Links installation to that user
- If not found → Creates client without user (links when user logs in)

---

## Security

- ✅ Sessions stored server-side
- ✅ HttpOnly cookies (prevents XSS)
- ✅ Secure cookies in production (HTTPS only)
- ✅ OAuth state parameter (prevents CSRF)
- ✅ Protected API routes (require authentication)

---

## Next Steps

1. Set up OAuth App and add credentials to Railway
2. Run migration: `npm run migrate:deploy`
3. Test login flow
4. Install GitHub App on repositories
5. View summaries in the dashboard!

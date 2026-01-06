# Supabase JWT Authentication Setup

This document describes the Supabase JWT authentication integration that has been implemented.

## ✅ What's Been Done

1. **Installed Dependencies**
   - Added `@supabase/supabase-js` package

2. **Database Schema Updates**
   - Added `supabaseId` field to `User` model (nullable, unique)
   - Made `githubId` and `githubLogin` nullable (to support users without GitHub)
   - Made `email` unique
   - Created migration: `20260106034222_add_supabase_auth`

3. **Configuration**
   - Added Supabase config to `src/config.ts`:
     - `SUPABASE_URL` (from environment variable)
     - `SUPABASE_ANON_KEY` (from environment variable)

4. **Middleware**
   - Created `src/middleware/supabaseAuth.ts` with `trySupabaseAuth()` function
   - Updated `src/middleware/auth.ts` to try Supabase JWT auth first, then fall back to session auth

## 🔧 Setup Steps

### 1. Run Database Migration

Apply the migration to your database:

```bash
npm run migrate:deploy
```

Or if running locally with Railway tunnel:

```bash
npm run migrate:dev
```

**Note**: The migration will fail if you have duplicate emails in the User table. Clean up duplicates before running the migration.

### 2. Set Environment Variables

In Railway (for production) or your `.env` file (for local development), add:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

**Where to find these values:**
- Go to your Supabase project dashboard
- Settings → API
- Copy the "Project URL" (SUPABASE_URL)
- Copy the "anon public" key (SUPABASE_ANON_KEY)

### 3. How It Works

The authentication flow works as follows:

1. **Request comes in with `Authorization: Bearer <token>` header**
   - Middleware extracts the JWT token
   - Verifies it with Supabase
   - Finds or creates a backend User record linked to the Supabase user
   - Sets `req.userId` and `req.user`

2. **No Bearer token, but session exists**
   - Falls back to session-based authentication (existing GitHub OAuth flow)

3. **No authentication**
   - Returns 401 Unauthorized

### 4. User Linking Logic

When a Supabase user authenticates:

1. First tries to find user by `supabaseId`
2. If not found, tries to find by `email`
3. If not found, tries to find by `githubLogin` (if user has GitHub provider)
4. If still not found, creates a new User record
5. If user exists but doesn't have `supabaseId`, links it by updating the record

This ensures existing users can be linked to Supabase accounts seamlessly.

## 📝 Frontend Integration

To use Supabase JWT authentication from your frontend, send requests with the Authorization header:

```typescript
// Get Supabase session token
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

// Send request with Bearer token
const response = await fetch(`${backendUrl}/api/clients`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  },
  credentials: 'include', // Still include credentials for session fallback
});
```

## 🔄 Backward Compatibility

The implementation maintains full backward compatibility:

- Existing session-based authentication (GitHub OAuth) still works
- Routes protected by `requireAuth` middleware work with both methods
- If no Supabase credentials are configured, the middleware gracefully skips Supabase auth

## 🧪 Testing

1. **Test Supabase JWT Auth:**
   ```bash
   # Get token from Supabase (in your frontend)
   # Then test API:
   curl -H "Authorization: Bearer YOUR_SUPABASE_JWT" \
        https://street-client-production.up.railway.app/api/clients
   ```

2. **Test Session Auth (should still work):**
   - Log in via GitHub OAuth
   - Session should work as before

## 📚 Files Modified

- `package.json` - Added `@supabase/supabase-js` dependency
- `prisma/schema.prisma` - Updated User model
- `src/config.ts` - Added Supabase configuration
- `src/middleware/supabaseAuth.ts` - New file for Supabase authentication
- `src/middleware/auth.ts` - Updated to support Supabase JWT tokens
- `prisma/migrations/20260106034222_add_supabase_auth/migration.sql` - Database migration

## ⚠️ Important Notes

1. **Email Uniqueness**: The migration adds a unique constraint on email. If you have duplicate emails, the migration will fail. Clean up duplicates first.

2. **Nullable Fields**: `githubId` and `githubLogin` are now nullable to support Supabase-only users. Existing code should handle this gracefully (use optional chaining where needed).

3. **Migration**: Run the migration in your production environment (Railway) using `npm run migrate:deploy` or through Railway's deployment process.

4. **Environment Variables**: Make sure to add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to Railway environment variables for production.

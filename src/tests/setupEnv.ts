import { readFileSync } from 'fs';
import { join } from 'path';

const TEST_CONTAINER_FILE = join(process.cwd(), '.testcontainers.json');

const raw = readFileSync(TEST_CONTAINER_FILE, 'utf-8');
const data = JSON.parse(raw) as { databaseUrl?: string };

if (data.databaseUrl == null) {
  throw new Error('Missing databaseUrl from test container setup.');
}

process.env.DATABASE_URL = data.databaseUrl;
process.env.NODE_ENV = 'test';
process.env.COINGECKO_API_KEY = process.env.COINGECKO_API_KEY ?? 'test';
process.env.GITHUB_APP_ID = process.env.GITHUB_APP_ID ?? 'test';
process.env.GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID ?? 'test';
process.env.GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET ?? 'test';
process.env.GITHUB_APP_PRIVATE_KEY =
  process.env.GITHUB_APP_PRIVATE_KEY ?? 'test';
process.env.GITHUB_APP_WEBHOOK_SECRET =
  process.env.GITHUB_APP_WEBHOOK_SECRET ?? 'test';
process.env.SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://localhost';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? 'test';
process.env.SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ?? 'test';
process.env.ADMIN_SUPERUSER_EMAIL =
  process.env.ADMIN_SUPERUSER_EMAIL ?? 'admin@example.com';
process.env.X_API_BEARER_TOKEN = process.env.X_API_BEARER_TOKEN ?? 'test';
process.env.X_API_CONSUMER_KEY = process.env.X_API_CONSUMER_KEY ?? 'test';
process.env.X_API_CONSUMER_SECRET = process.env.X_API_CONSUMER_SECRET ?? 'test';
process.env.X_API_TOKEN_KEY = process.env.X_API_TOKEN_KEY ?? 'test';
process.env.X_API_TOKEN_SECRET = process.env.X_API_TOKEN_SECRET ?? 'test';

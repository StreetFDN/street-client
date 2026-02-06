import dotenv from 'dotenv';
import { getDefaultEnv, getRequiredEnv } from './utils/env';

dotenv.config();

const port = Number(getDefaultEnv('PORT', '8080'));

// If Railway provides a public URL, use it. Otherwise fall back to localhost.
const railwayPublicUrl = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : process.env.RAILWAY_STATIC_URL || ''; // sometimes present

const baseUrl = getDefaultEnv(
  'BASE_URL',
  railwayPublicUrl || `http://localhost:${port}`,
);

export const config = {
  port,
  nodeEnv: getDefaultEnv('NODE_ENV', 'development'),
  databaseUrl: getRequiredEnv('DATABASE_URL'),
  frontEnd: {
    url: getDefaultEnv('CLIENT_DASHBOARD_FE_URL', 'http://localhost:3000'),
  },
  redis: {
    url: getDefaultEnv('REDIS_URL', 'redis://localhost:6379'),
  },
  coingecko: {
    apiKey: getRequiredEnv('COINGECKO_API_KEY'),
  },
  github: {
    appId: getRequiredEnv('GITHUB_APP_ID'),
    clientId: getRequiredEnv('GITHUB_CLIENT_ID'),
    clientSecret: getRequiredEnv('GITHUB_CLIENT_SECRET'),
    privateKey: getRequiredEnv('GITHUB_APP_PRIVATE_KEY').replace(/\\n/g, '\n'),
    webhookSecret: getRequiredEnv('GITHUB_APP_WEBHOOK_SECRET'),
  },
  session: {
    secret:
      process.env.NODE_ENV === 'production'
        ? getRequiredEnv('SESSION_SECRET')
        : getDefaultEnv('SESSION_SECRET', Math.random().toString(36)),
  },
  openai: {
    apiKey: getDefaultEnv('OPENAI_API_KEY'),
  },
  supabase: {
    url: getRequiredEnv('SUPABASE_URL'),
    anonKey: getRequiredEnv('SUPABASE_ANON_KEY'),
    publishableKey: getRequiredEnv('SUPABASE_PUBLISHABLE_KEY'),
  },
  xApi: {
    consumer: {
      key: getRequiredEnv('X_API_CONSUMER_KEY'),
      secret: getRequiredEnv('X_API_CONSUMER_SECRET'),
    },
    token: {
      key: getRequiredEnv('X_API_TOKEN_KEY'),
      secret: getRequiredEnv('X_API_TOKEN_SECRET'),
    },
    syncCron: getDefaultEnv('X_API_SYNC_CRON', '0 */3 * * *'),
    enabled: getDefaultEnv('X_API_SYNC_ENABLED', 'true'),
  },
  baseUrl,
};

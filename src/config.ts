import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  github: {
    appId: process.env.GITHUB_APP_ID || '',
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
    webhookSecret: process.env.GITHUB_APP_WEBHOOK_SECRET || '',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
};

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

// GitHub App credentials are required for production, but can be empty during setup
// Uncomment these checks once you've set up your GitHub App:
// if (!config.github.appId) {
//   throw new Error('GITHUB_APP_ID is required');
// }
// if (!config.github.privateKey) {
//   throw new Error('GITHUB_APP_PRIVATE_KEY is required');
// }

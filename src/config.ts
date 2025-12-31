import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.PORT) || 8080;

// If Railway provides a public URL, use it. Otherwise fall back to localhost.
const railwayPublicUrl =
  process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : process.env.RAILWAY_STATIC_URL || ""; // sometimes present

const baseUrl =
  process.env.BASE_URL ||
  railwayPublicUrl ||
  `http://localhost:${port}`;

export const config = {
  port,
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL || "",
  github: {
    appId: process.env.GITHUB_APP_ID || "",
    clientId: process.env.GITHUB_CLIENT_ID || "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n") || "",
    webhookSecret: process.env.GITHUB_APP_WEBHOOK_SECRET || "",
  },
  session: {
    secret: process.env.SESSION_SECRET || 'change-me-in-production-' + Math.random().toString(36),
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
  },
  baseUrl,
};

if (!config.databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

import express from 'express';
import session from 'express-session';
import path from 'path';
import { config } from './config';
import activityRoutes from './routes/activity';
import authRoutes from './routes/auth';
import clientRoutes from './routes/clients';
import installationRoutes from './routes/installations';
import adminRoutes from './routes/admin';
import repoRoutes from './routes/repos';
import summaryRoutes from './routes/summaries';
import syncRoutes from './routes/sync';
import tokenRoutes from './routes/token';
import testAuthRoutes from './routes/test-auth';
import socialRoutes from './routes/social';
import githubWebhookRoutes from './routes/webhooks/github';
import { startScheduler } from './worker/scheduler';
import { initRedis } from './utils/redis';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';

const app = express();

app.use(
  cors({
    origin: config.frontEnd.url,
    credentials: true,
  }),
);

app.use(cookieParser());

// Session configuration
app.use(
  session({
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: config.nodeEnv === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  }),
);

// Webhook endpoint needs raw body for signature verification
app.use(
  '/webhooks/github',
  express.raw({ type: 'application/json' }),
  githubWebhookRoutes,
);

// Other API routes use JSON
app.use(express.json());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Auth routes (before API routes)
app.use('/api/auth', authRoutes);

// API routes
app.use('/api/admin', adminRoutes);
app.use('/api', activityRoutes);
app.use('/api', clientRoutes);
app.use('/api', installationRoutes);
app.use('/api', repoRoutes);
app.use('/api', summaryRoutes);
app.use('/api', tokenRoutes);
app.use('/api', socialRoutes);
app.use('/api/sync', syncRoutes);

// Example endpoint for demonstration, will delete once auth is implemented site-wide
app.use('/api/test-auth', testAuthRoutes);

// Serve static files (frontend) - before API routes to allow /api/auth routes
app.use(express.static(path.join(__dirname, '../public')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start scheduler
startScheduler();
initRedis();

export default app;

import express from 'express';
import session from 'express-session';
import path from 'path';
import { config } from './config';
import webhookRoutes from './routes/webhooks';
import authRoutes from './routes/auth';
import clientRoutes from './routes/clients';
import installationRoutes from './routes/installations';
import repoRoutes from './routes/repos';
import summaryRoutes from './routes/summaries';
import syncRoutes from './routes/sync';
import tokenRoutes from './routes/token'
import { startScheduler } from './worker/scheduler';

const app = express();

// Session configuration
app.use(session({
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.nodeEnv === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
}));

// Webhook endpoint needs raw body for signature verification
app.use('/webhooks/github', express.raw({ type: 'application/json' }), webhookRoutes);

// Other API routes use JSON
app.use(express.json());

// Auth routes (before API routes)
app.use('/api/auth', authRoutes);

// API routes
app.use('/api', clientRoutes);
app.use('/api', installationRoutes);
app.use('/api', repoRoutes);
app.use('/api', summaryRoutes);
app.use('/api', tokenRoutes);
app.use('/api/sync', syncRoutes);

// Serve static files (frontend) - before API routes to allow /api/auth routes
app.use(express.static(path.join(__dirname, '../public')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start scheduler
startScheduler();

export default app;


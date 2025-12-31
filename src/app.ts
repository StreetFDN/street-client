import express from 'express';
import webhookRoutes from './routes/webhooks';
import clientRoutes from './routes/clients';
import installationRoutes from './routes/installations';
import repoRoutes from './routes/repos';
import summaryRoutes from './routes/summaries';
import { startScheduler } from './worker/scheduler';

const app = express();

// Webhook endpoint needs raw body for signature verification
app.use('/webhooks/github', express.raw({ type: 'application/json' }), webhookRoutes);

// Other API routes use JSON
app.use(express.json());

// API routes
app.use('/api', clientRoutes);
app.use('/api', installationRoutes);
app.use('/api', repoRoutes);
app.use('/api', summaryRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start scheduler
startScheduler();

export default app;


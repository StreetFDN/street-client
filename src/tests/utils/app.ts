import express from 'express';
import activityRoutes from 'routes/activity';
import authRoutes from 'routes/auth';
import clientRoutes from 'routes/clients';
import installationRoutes from 'routes/installations';
import repoRoutes from 'routes/repos';
import socialRoutes from 'routes/social';
import summaryRoutes from 'routes/summaries';
import syncRoutes from 'routes/sync';
import tokenRoutes from 'routes/token';

export function createTestApp() {
  const app = express();

  app.use(express.json());
  app.use((req, _res, next) => {
    const userId = req.header('x-test-user-id');
    if (userId) {
      req.userId = userId;
      req.user = {
        id: userId,
        email: `${userId}@test.local`,
        isSuperUser: false,
        accesses: [],
      };
    }
    next();
  });

  app.use('/api/auth', authRoutes);
  app.use('/api', clientRoutes);
  app.use('/api', activityRoutes);
  app.use('/api', installationRoutes);
  app.use('/api', repoRoutes);
  app.use('/api', socialRoutes);
  app.use('/api', summaryRoutes);
  app.use('/api', tokenRoutes);
  app.use('/api/sync', syncRoutes);

  return app;
}

import { Router, Request, Response } from 'express';
import { requireAuth } from 'middleware/auth';
import { syncRepo, syncAllReposDaily } from 'services/sync';
import { findUserAccessToRepository } from 'utils/db';
import { UserRole } from '@prisma/client';

const router = Router();

/**
 * POST /api/sync/trigger
 * Manually trigger a sync for all repos (last 24 hours, updates today's date)
 */
router.post('/trigger', requireAuth, async (req: Request, res: Response) => {
  // TODO (mlacko): Fix this. The authorization is wrong.
  try {
    console.log('Manual sync triggered');
    // Run sync asynchronously
    syncAllReposDaily()
      .then(() => {
        console.log('Manual sync completed successfully');
      })
      .catch((error) => {
        console.error('Error in manual sync:', error);
      });

    res.json({
      message: 'Sync started for all enabled repos',
      status: 'started',
    });
  } catch (error) {
    console.error('Error triggering sync:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/sync/repos/:repoId
 * Manually trigger a sync for a specific repo (last 24 hours)
 */
router.post(
  '/repos/:repoId',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { repoId } = req.params;
      const userId = req.user!.id;

      if (userId == null) {
        return res.status(401).json({ error: 'Access denied' });
      }

      const access = await findUserAccessToRepository(
        userId,
        repoId,
        UserRole.ADMIN,
      );

      if (access == null) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const repo = access.repo;

      // Sync last 24 hours
      const windowEnd = new Date();
      const windowStart = new Date(windowEnd.getTime() - 24 * 60 * 60 * 1000);

      // Run sync asynchronously
      syncRepo(repo.id, windowStart, windowEnd, 'daily').catch((error) => {
        console.error(`Error syncing repo ${repoId}:`, error);
      });

      res.json({ message: 'Sync started', repoId });
    } catch (error) {
      console.error('Error triggering repo sync:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;

import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { backfillRepo } from '../services/sync';

const router = Router();

/**
 * GET /api/clients/:clientId/repos/:repoId/summaries
 * Get daily summaries for a repo
 * Query params: from (YYYY-MM-DD), to (YYYY-MM-DD), limit, offset
 */
router.get('/clients/:clientId/repos/:repoId/summaries', async (req: Request, res: Response) => {
  try {
    const { clientId, repoId } = req.params;
    const { from, to, limit = '100', offset = '0' } = req.query;

    // Verify repo belongs to client
    const repo = await prisma.githubRepo.findFirst({
      where: {
        id: repoId,
        clientId,
      },
    });

    if (!repo) {
      return res.status(404).json({ error: 'Repo not found' });
    }

    const where: any = {
      repoId,
    };

    if (from || to) {
      where.date = {};
      if (from) {
        where.date.gte = new Date(from as string);
      }
      if (to) {
        where.date.lte = new Date(to as string);
      }
    }

    const summaries = await prisma.repoDailySummary.findMany({
      where,
      orderBy: {
        date: 'desc',
      },
      take: parseInt(limit as string, 10),
      skip: parseInt(offset as string, 10),
      include: {
        repo: {
          select: {
            owner: true,
            name: true,
          },
        },
      },
    });

    res.json(
      summaries.map(summary => ({
        id: summary.id,
        repo: {
          owner: summary.repo.owner,
          name: summary.repo.name,
        },
        date: summary.date,
        windowStart: summary.windowStart,
        windowEnd: summary.windowEnd,
        summary: summary.summaryText,
        stats: summary.stats,
        noChanges: summary.noChanges,
        createdAt: summary.createdAt,
      }))
    );
  } catch (error) {
    console.error('Error fetching summaries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/clients/:clientId/summaries
 * Get aggregated summaries across all repos for a client
 */
router.get('/clients/:clientId/summaries', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { from, to, limit = '100', offset = '0' } = req.query;

    const where: any = {
      repo: {
        clientId,
      },
    };

    if (from || to) {
      where.date = {};
      if (from) {
        where.date.gte = new Date(from as string);
      }
      if (to) {
        where.date.lte = new Date(to as string);
      }
    }

    const summaries = await prisma.repoDailySummary.findMany({
      where,
      orderBy: {
        date: 'desc',
      },
      take: parseInt(limit as string, 10),
      skip: parseInt(offset as string, 10),
      include: {
        repo: {
          select: {
            id: true,
            owner: true,
            name: true,
          },
        },
      },
    });

    res.json(
      summaries.map(summary => ({
        id: summary.id,
        repo: {
          id: summary.repo.id,
          owner: summary.repo.owner,
          name: summary.repo.name,
        },
        date: summary.date,
        windowStart: summary.windowStart,
        windowEnd: summary.windowEnd,
        summary: summary.summaryText,
        stats: summary.stats,
        noChanges: summary.noChanges,
        createdAt: summary.createdAt,
      }))
    );
  } catch (error) {
    console.error('Error fetching client summaries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/repos/:repoId/backfill
 * Manually trigger a backfill for a repo
 */
router.post('/repos/:repoId/backfill', async (req: Request, res: Response) => {
  try {
    const { repoId } = req.params;

    const repo = await prisma.githubRepo.findUnique({
      where: { id: repoId },
    });

    if (!repo) {
      return res.status(404).json({ error: 'Repo not found' });
    }

    // Run backfill asynchronously
    backfillRepo(repoId).catch(error => {
      console.error(`Error in backfill for ${repoId}:`, error);
    });

    res.json({ message: 'Backfill started', repoId });
  } catch (error) {
    console.error('Error triggering backfill:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/repos/:repoId/summaries
 * Get summaries for a repo (convenience endpoint)
 */
router.get('/repos/:repoId/summaries', async (req: Request, res: Response) => {
  try {
    const { repoId } = req.params;
    const { from, to, limit = '100', offset = '0' } = req.query;

    const where: any = { repoId };

    if (from || to) {
      where.date = {};
      if (from) {
        where.date.gte = new Date(from as string);
      }
      if (to) {
        where.date.lte = new Date(to as string);
      }
    }

    const summaries = await prisma.repoDailySummary.findMany({
      where,
      orderBy: {
        date: 'desc',
      },
      take: parseInt(limit as string, 10),
      skip: parseInt(offset as string, 10),
      include: {
        repo: {
          select: {
            owner: true,
            name: true,
          },
        },
      },
    });

    res.json(
      summaries.map(summary => ({
        id: summary.id,
        repo: {
          owner: summary.repo.owner,
          name: summary.repo.name,
        },
        date: summary.date,
        windowStart: summary.windowStart,
        windowEnd: summary.windowEnd,
        summary: summary.summaryText,
        stats: summary.stats,
        noChanges: summary.noChanges,
        createdAt: summary.createdAt,
      }))
    );
  } catch (error) {
    console.error('Error fetching repo summaries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { backfillRepo } from '../services/sync';
import { requireAuth } from '../middleware/auth';
import { generateAggregateSummary } from '../services/summarizer';
import {
  findUserAccessToClient,
  findUserAccessToRepository,
} from '../utils/db';
import { Prisma, UserRole } from '@prisma/client';

const router = Router();

/**
 * GET /api/clients/:clientId/repos/:repoId/summaries
 * Get daily summaries for a repo (must belong to authenticated user)
 * Query params: from (YYYY-MM-DD), to (YYYY-MM-DD), limit, offset
 */
router.get(
  '/clients/:clientId/repos/:repoId/summaries',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { clientId, repoId } = req.params;
      const { from, to, limit = '100', offset = '0' } = req.query;
      const userId = req.user!.id;

      if (userId == null) {
        return res.status(401).json({ error: 'Access denied' });
      }

      // Verify repo belongs to client and user
      const access = await findUserAccessToRepository(
        userId,
        repoId,
        UserRole.SHARED_ACCESS,
        clientId,
      );

      if (access == null) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const where: Prisma.RepoDailySummaryWhereInput = {
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
        summaries.map((summary) => ({
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
        })),
      );
    } catch (error) {
      console.error('Error fetching summaries:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

/**
 * GET /api/clients/:clientId/summaries
 * Get aggregated summaries across all repos for a client
 * Query params: from (YYYY-MM-DD), to (YYYY-MM-DD), limit, offset
 */
router.get(
  '/clients/:clientId/summaries',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const { from, to, limit = '100', offset = '0' } = req.query;
      const userId = req.user!.id;

      if (userId == null) {
        return res.status(401).json({ error: 'Access denied' });
      }

      // Verify client belongs to user
      const access = await findUserAccessToClient(
        userId,
        clientId,
        UserRole.SHARED_ACCESS,
      );

      if (access == null) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const where: Prisma.RepoDailySummaryWhereInput = {
        repo: {
          installation: {
            client: {
              id: access.client.id,
            },
          },
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
        summaries.map((summary) => ({
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
        })),
      );
    } catch (error) {
      console.error('Error fetching client summaries:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

/**
 * GET /api/clients/:clientId/summary/7days
 * Get aggregated 7-day summary across all repos for a client
 */
router.get(
  '/clients/:clientId/summary/7days',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const userId = req.user!.id;

      if (userId == null) {
        return res.status(401).json({ error: 'Access denied' });
      }

      const access = await findUserAccessToClient(
        userId,
        clientId,
        UserRole.SHARED_ACCESS,
      );

      if (access == null) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (access.client.githubInstallationId == null) {
        return [];
      }

      // Get date range (last 7 days)
      const to = new Date();
      to.setUTCHours(23, 59, 59, 999);
      const from = new Date(to);
      from.setUTCDate(from.getUTCDate() - 6);
      from.setUTCHours(0, 0, 0, 0);

      // Fetch all summaries from last 7 days with full repo info
      const summaries = await prisma.repoDailySummary.findMany({
        where: {
          repo: {
            installationId: access.client.githubInstallationId,
            isEnabled: true,
          },
          date: {
            gte: from,
            lte: to,
          },
        },
        include: {
          repo: {
            select: {
              id: true,
              owner: true,
              name: true,
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
      });

      // Fetch actual activity events for concrete data (PR titles, commits, releases)
      const activityEvents = await prisma.repoActivityEvent.findMany({
        where: {
          repo: {
            installationId: access.client.githubInstallationId,
            isEnabled: true,
          },
          occurredAt: {
            gte: from,
            lte: to,
          },
        },
        include: {
          repo: {
            select: {
              owner: true,
              name: true,
            },
          },
        },
        orderBy: {
          occurredAt: 'desc',
        },
        take: 100, // Limit to avoid token bloat
      });

      // Generate aggregate summary with actual activity events
      const aggregateSummary = await generateAggregateSummary(
        summaries,
        activityEvents,
      );

      // Calculate aggregate stats
      const stats = summaries.reduce(
        (acc, summary) => {
          if (summary.stats) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const s = summary.stats as any;
            acc.mergedPRs += s.mergedPRs || 0;
            acc.releases += s.releases || 0;
            acc.commits += s.commits || 0;
            acc.repos.add(summary.repoId);
          }
          return acc;
        },
        { mergedPRs: 0, releases: 0, commits: 0, repos: new Set<string>() },
      );

      res.json({
        summary: aggregateSummary,
        stats: {
          mergedPRs: stats.mergedPRs,
          releases: stats.releases,
          commits: stats.commits,
          repos: stats.repos.size,
          days: summaries.filter((s) => !s.noChanges).length,
        },
        period: {
          from: from.toISOString(),
          to: to.toISOString(),
        },
      });
    } catch (error) {
      console.error('Error generating 7-day summary:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

/**
 * GET /api/clients/:clientId/summary/repos
 * Get repo-by-repo summaries for the last 7 days
 */
router.get(
  '/clients/:clientId/summary/repos',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const userId = req.user!.id;

      if (userId == null) {
        return res.status(401).json({ error: 'Access denied' });
      }

      // Verify client belongs to user
      const access = await findUserAccessToClient(
        userId,
        clientId,
        UserRole.SHARED_ACCESS,
      );

      if (access == null) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (access.client.githubInstallationId == null) {
        return [];
      }

      // Get date range (last 7 days)
      const to = new Date();
      to.setUTCHours(23, 59, 59, 999);
      const from = new Date(to);
      from.setUTCDate(from.getUTCDate() - 6);
      from.setUTCHours(0, 0, 0, 0);

      // Get all repos with their activity
      const repos = await prisma.gitHubRepo.findMany({
        where: {
          installationId: access.client.githubInstallationId,
          isEnabled: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      const repoSummaries = await Promise.all(
        repos.map(async (repo) => {
          // Get summaries for this repo
          const summaries = await prisma.repoDailySummary.findMany({
            where: {
              repoId: repo.id,
              date: {
                gte: from,
                lte: to,
              },
            },
            orderBy: {
              date: 'desc',
            },
          });

          // Get activity events for this repo
          const activityEvents = await prisma.repoActivityEvent.findMany({
            where: {
              repoId: repo.id,
              occurredAt: {
                gte: from,
                lte: to,
              },
            },
            orderBy: {
              occurredAt: 'desc',
            },
            take: 50, // Limit per repo
          });

          // Filter out repos with no activity
          const activeSummaries = summaries.filter((s) => !s.noChanges);
          if (activeSummaries.length === 0 && activityEvents.length === 0) {
            return null;
          }

          // Generate summary for this repo using the aggregate function
          // but with only this repo's data
          const repoSummary = await generateAggregateSummary(
            activeSummaries,
            activityEvents,
          );

          // Calculate stats
          const stats = summaries.reduce(
            (acc, summary) => {
              if (summary.stats) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const s = summary.stats as any;
                acc.mergedPRs += s.mergedPRs || 0;
                acc.releases += s.releases || 0;
                acc.commits += s.commits || 0;
              }
              return acc;
            },
            { mergedPRs: 0, releases: 0, commits: 0 },
          );

          return {
            repo: {
              id: repo.id,
              owner: repo.owner,
              name: repo.name,
              fullName: `${repo.owner}/${repo.name}`,
            },
            summary: repoSummary,
            stats: {
              mergedPRs: stats.mergedPRs,
              releases: stats.releases,
              commits: stats.commits,
              days: activeSummaries.length,
            },
          };
        }),
      );

      // Filter out null entries (repos with no activity)
      const activeRepos = repoSummaries.filter(
        (r): r is NonNullable<typeof r> => r !== null,
      );

      res.json({
        repos: activeRepos,
        period: {
          from: from.toISOString(),
          to: to.toISOString(),
        },
      });
    } catch (error) {
      console.error('Error generating repo-by-repo summaries:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

/**
 * POST /api/repos/:repoId/backfill
 * Manually trigger a backfill for a repo
 */
router.post(
  '/repos/:repoId/backfill',
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

      await backfillRepo(repoId).catch((error) => {
        console.error(`Error in backfill for repo ${repoId}:`, error);
      });

      res.json({ message: 'Backfill started', repoId });
    } catch (error) {
      console.error('Error triggering backfill:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

/**
 * GET /api/repos/:repoId/summaries
 * Get summaries for a repo (alias for client/repo route)
 */
router.get(
  '/repos/:repoId/summaries',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { repoId } = req.params;
      const { from, to, limit = '100', offset = '0' } = req.query;
      const userId = req.user!.id;

      if (userId == null) {
        return res.status(401).json({ error: 'Access denied' });
      }

      const access = await findUserAccessToRepository(
        userId,
        repoId,
        UserRole.SHARED_ACCESS,
      );

      // Verify repo belongs to user
      if (access == null) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const where: Prisma.RepoDailySummaryWhereInput = {
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
      });

      res.json(
        summaries.map((summary) => ({
          id: summary.id,
          date: summary.date,
          windowStart: summary.windowStart,
          windowEnd: summary.windowEnd,
          summary: summary.summaryText,
          stats: summary.stats,
          noChanges: summary.noChanges,
          createdAt: summary.createdAt,
        })),
      );
    } catch (error) {
      console.error('Error fetching summaries:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;

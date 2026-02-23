import { Router, Request, Response } from 'express';

import { prisma } from 'db';
import { requireAuth } from 'middleware/auth';
import { findUserAccessToClient } from 'utils/db';
import { UserRole } from '@prisma/client';
import { SocialWindowSchema } from 'types/routes/social';
import { z } from 'zod';

const router = Router();

/**
 * GET /api/clients/:clientId/social/x/followers-metrics
 * List follower snapshots for the client's X account.
 */
router.get(
  '/clients/:clientId/social/x/followers-metrics',
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

      const xAccount = await prisma.xAccount.findUnique({
        where: {
          clientId,
        },
      });

      if (xAccount == null) {
        return res.status(404).json({ error: 'X account not configured' });
      }

      const parsedQuery = SocialWindowSchema.safeParse(req.query);
      if (!parsedQuery.success) {
        return res.status(400).json({
          error:
            'Invalid query parameters. Expected: startTime (ISO timestamp, default now - 7 days), endTime (ISO timestamp, default now).',
          details: z.treeifyError(parsedQuery.error),
        });
      }

      const snapshots = await prisma.xAccountSnapshot.findMany({
        where: {
          xAccountId: xAccount.id,
          createdAt: {
            gte: parsedQuery.data.start_time,
            lte: parsedQuery.data.end_time,
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      return res.json({
        xAccount: {
          id: xAccount.id,
          userId: xAccount.userId,
          username: xAccount.username,
          profileUrl: xAccount.profileUrl,
        },
        window: {
          startTime: parsedQuery.data.start_time,
          endTime: parsedQuery.data.end_time,
        },
        snapshots: snapshots.map((snapshot) => ({
          createdAt: snapshot.createdAt,
          followers: snapshot.followers,
        })),
      });
    } catch (error) {
      console.error('Error listing X follower snapshots:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
);

/**
 * GET /api/clients/:clientId/social/x/post-metrics
 * List 24h metrics snapshots for the client's X account.
 */
router.get(
  '/clients/:clientId/social/x/post-metrics',
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

      const xAccount = await prisma.xAccount.findUnique({
        where: {
          clientId,
        },
      });

      if (xAccount == null) {
        return res.status(404).json({ error: 'X account not configured' });
      }

      const parsedQuery = SocialWindowSchema.safeParse(req.query);
      if (!parsedQuery.success) {
        return res.status(400).json({
          error:
            'Invalid query parameters. Expected: startTime (ISO timestamp, default now - 7 days), endTime (ISO timestamp, default now).',
          details: z.treeifyError(parsedQuery.error),
        });
      }

      const aggregates = await prisma.xPostSnapshot.groupBy({
        by: ['createdAt'],
        where: {
          xAccountId: xAccount.id,
          createdAt: {
            gte: parsedQuery.data.start_time,
            lte: parsedQuery.data.end_time,
          },
        },
        _sum: {
          likes: true,
          reposts: true,
          replies: true,
          impressions: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      return res.json({
        xAccount: {
          id: xAccount.id,
          userId: xAccount.userId,
          username: xAccount.username,
          profileUrl: xAccount.profileUrl,
        },
        window: {
          startTime: parsedQuery.data.start_time,
          endTime: parsedQuery.data.end_time,
        },
        snapshots: aggregates.map((snapshot) => ({
          createdAt: snapshot.createdAt,
          windowStart: new Date(
            snapshot.createdAt.getTime() - 24 * 60 * 60 * 1000,
          ),
          likes: snapshot._sum.likes ?? 0,
          reposts: snapshot._sum.reposts ?? 0,
          replies: snapshot._sum.replies ?? 0,
          impressions: snapshot._sum.impressions ?? 0,
        })),
      });
    } catch (error) {
      console.error('Error listing X metrics snapshots:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;

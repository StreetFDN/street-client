import { Request, Response, Router } from 'express';
import { requireAuth } from 'middleware/auth';
import { prisma } from '../db';
import { RepoActivityEvent, UserRole } from '@prisma/client';
import { z } from 'zod';
import { RequestError } from 'utils/errors';
import { findUserAccessToRepository } from 'utils/db';

const router = Router();

const GetActivityQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(100),
  offsetId: z.coerce.string().nullable().optional(),
});

type GetActivityQuery = {
  repoId: string;
  limit: number;
  offsetId?: string | null;
};

router.get(
  '/clients/:clientId/repos/:repoId/activity',
  requireAuth,
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { clientId, repoId } = req.params;

    const parsedQuery = GetActivityQuerySchema.safeParse(req.query);

    if (!parsedQuery.success) {
      return res.status(400).json({
        error:
          'Invalid query parameters. Expected: limit (integer 1-100, default 100), offsetId (optional string or null).',
        details: z.treeifyError(parsedQuery.error),
      });
    }

    const { limit, offsetId } = parsedQuery.data;

    try {
      const userRepositoryAccess = await findUserAccessToRepository(
        userId,
        repoId,
        UserRole.SHARED_ACCESS,
        clientId,
      );

      if (userRepositoryAccess == null) {
        return res.status(403).json({ error: 'Access Denied' });
      }

      const repo = userRepositoryAccess.repo;

      const activity = await listRepoActivity({ repoId, limit, offsetId });
      const maybeLastEntry = activity[activity.length - 1];

      res.json({
        data: activity.map((entry) => ({
          id: entry.id,
          repo: {
            owner: repo.owner,
            name: repo.name,
          },
          occurredAt: entry.occurredAt,
          type: entry.type,
          url: entry.url,
          title: entry.title,
          author: entry.author,
        })),
        pagination: {
          offsetId: maybeLastEntry?.id,
        },
      });
    } catch (error) {
      if (error instanceof RequestError) {
        console.info(
          'Could not load activity feed due to the bad request: ',
          error,
        );
        res.status(400).json({
          error: error.message || 'Bad request',
          details: error.cause,
        });
      } else {
        console.error(
          'Could not load activity feed due to the internal error: ',
          error,
        );
        res.status(500).json({
          error: 'Internal server error',
        });
      }
    }
  },
);

async function listRepoActivity({
  repoId,
  limit,
  offsetId,
}: GetActivityQuery): Promise<RepoActivityEvent[]> {
  const start =
    offsetId != null
      ? await prisma.repoActivityEvent.findUnique({
          where: { id: offsetId },
          select: { occurredAt: true },
        })
      : null;

  if (offsetId != null && start == null) {
    throw new RequestError('Non-existent offsetId', { offsetId });
  }

  const where =
    start != null
      ? {
          repoId,
          occurredAt: {
            lt: start.occurredAt,
          },
        }
      : {
          repoId,
        };

  return prisma.repoActivityEvent.findMany({
    where,
    orderBy: [{ occurredAt: 'desc' }],
    take: limit,
  });
}

export default router;

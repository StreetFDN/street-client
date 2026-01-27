import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';
import { getInstallationOctokit } from '../services/github/auth';
import { backfillRepo } from '../services/sync';

const router = Router();

/**
 * GET /api/clients/:clientId/installations
 * List GitHub installations for a client (must belong to authenticated user)
 */
router.get(
  '/clients/:clientId/installations',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;

      // Verify client belongs to user
      const client = await prisma.client.findFirst({
        where: { id: clientId, userId: req.userId || undefined },
      });

      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      const installations = await prisma.gitHubInstallation.findMany({
        where: {
          clientId,
          revokedAt: null,
        },
        include: {
          _count: {
            select: {
              repos: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.json(
        installations.map((inst: any) => ({
          id: inst.id,
          installationId: inst.installationId,
          accountLogin: inst.accountLogin,
          repoCount: inst._count.repos,
          createdAt: inst.createdAt,
        })),
      );
    } catch (error) {
      console.error('Error listing installations:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

/**
 * POST /api/installations/:installationId/sync
 * Manually sync repositories for an installation (fetches all repos from GitHub)
 */
router.post(
  '/installations/:installationId/sync',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const installationId = parseInt(req.params.installationId, 10);

      const installation = await prisma.gitHubInstallation.findUnique({
        where: { installationId },
        include: {
          client: true,
        },
      });

      if (!installation) {
        return res.status(404).json({ error: 'Installation not found' });
      }

      // Verify client belongs to user
      if (installation.client.userId !== req.userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Fetch all repositories from GitHub
      const octokit = await getInstallationOctokit(installationId);
      const response =
        await octokit.rest.apps.listReposAccessibleToInstallation({
          per_page: 100,
        });

      let synced = 0;
      const reposToBackfill: string[] = [];

      // Process each repository
      for (const repo of response.data.repositories) {
        try {
          const existingRepo = await prisma.gitHubRepo.findUnique({
            where: { repoId: repo.id },
          });

          const githubRepo = await prisma.gitHubRepo.upsert({
            where: {
              repoId: repo.id,
            },
            create: {
              clientId: installation.clientId,
              installationId: installation.id,
              owner: repo.owner.login,
              name: repo.name,
              repoId: repo.id,
              isPrivate: repo.private,
              isEnabled: true,
            },
            update: {
              isPrivate: repo.private,
            },
          });

          synced++;
          console.log(`Repo synced: ${repo.owner.login}/${repo.name}`);

          // If this is a new repo, schedule backfill
          if (!existingRepo) {
            reposToBackfill.push(githubRepo.id);
          }
        } catch (error) {
          console.error(
            `Error processing repo ${repo.owner.login}/${repo.name}:`,
            error,
          );
        }
      }

      // Trigger backfill for new repos
      for (const repoId of reposToBackfill) {
        backfillRepo(repoId).catch((error) => {
          console.error(`Error backfilling repo ${repoId}:`, error);
        });
      }

      res.json({
        message: 'Repositories synced successfully',
        synced,
        backfilled: reposToBackfill.length,
      });
    } catch (error) {
      console.error('Error syncing installation repositories:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

/**
 * GET /api/installations
 * List all installations (for debugging)
 */
router.get(
  '/installations',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const installations = await prisma.gitHubInstallation.findMany({
        where: {
          revokedAt: null,
          client: {
            userId: req.userId || undefined,
          },
        },
        include: {
          client: true,
          _count: {
            select: {
              repos: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.json(
        installations.map((inst: any) => ({
          id: inst.id,
          installationId: inst.installationId,
          accountLogin: inst.accountLogin,
          clientId: inst.clientId,
          repoCount: inst._count.repos,
          createdAt: inst.createdAt,
        })),
      );
    } catch (error) {
      console.error('Error listing installations:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;

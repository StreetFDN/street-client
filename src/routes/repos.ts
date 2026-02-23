import { Router, Request, Response } from 'express';
import { prisma } from 'db';
import { requireAuth } from 'middleware/auth';
import { findUserAccessToClient, findUserAccessToRepository } from 'utils/db';
import { GitHubRepo, UserRole } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Maybe } from 'types/utils';

const router = Router();

/**
 * GET /api/clients/:clientId/repos
 * List all repos for a client (must belong to authenticated user)
 */
router.get(
  '/clients/:clientId/repos',
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
        {
          client: {
            githubInstallation: {
              include: {
                repos: true,
                creator: true,
              },
            },
          },
        },
      );

      if (access == null) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json(
        (access.client.githubInstallation?.repos ?? []).map(
          (repo: GitHubRepo) => ({
            id: repo.id,
            owner: repo.owner,
            name: repo.name,
            fullName: `${repo.owner}/${repo.name}`,
            isPrivate: repo.isPrivate,
            isEnabled: repo.isEnabled,
            installationId: access.client.githubInstallation!.id,
            createdAt: repo.createdAt,
            updatedAt: repo.updatedAt,
          }),
        ),
      );
    } catch (error) {
      console.error('Error listing repos:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

/**
 * GET /api/installations/:installationId/repos
 * List available repos for an installation (from GitHub)
 */
router.get(
  '/installations/:installationId/repos',
  async (req: Request, res: Response) => {
    try {
      const { installationId } = req.params;
      const userId = req.user!.id;

      if (userId == null) {
        return res.status(401).json({ error: 'Access denied' });
      }

      const access = await prisma.userRoleForClient.findFirst({
        where: {
          userId,
          client: {
            githubInstallation: {
              id: installationId,
            },
          },
        },
        include: {
          client: {
            include: {
              githubInstallation: {
                include: {
                  repos: true,
                },
              },
            },
          },
        },
      });

      if (access == null) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const repos = access.client.githubInstallation!.repos.map((repo) => ({
        id: repo.id,
        owner: repo.owner,
        name: repo.name,
        fullName: `${repo.owner}/${repo.name}`,
        isPrivate: repo.isPrivate,
        enabled: repo.isEnabled,
      }));

      res.json(repos);
    } catch (error) {
      console.error('Error listing installation repos:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

/**
 * POST /api/repos/:repoId/enable
 * Enable a repo for syncing
 */
router.post('/repos/:repoId/enable', async (req: Request, res: Response) => {
  try {
    const { repoId } = req.params;
    const userId = req.user!.id;

    if (userId == null) {
      return res.status(401).json({ error: 'Access denied' });
    }

    const repo = await changeRepoActivityStatus(userId, repoId, 'enabled');
    if (repo == null) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ message: 'Repository enabled', repo });
  } catch (error) {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }

    console.error('Error enabling repository:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/repos/:repoId/disable
 * Disable a repo for syncing
 */
router.post('/repos/:repoId/disable', async (req: Request, res: Response) => {
  try {
    const { repoId } = req.params;
    const userId = req.user!.id;

    if (userId == null) {
      return res.status(401).json({ error: 'Access denied' });
    }

    const repo = await changeRepoActivityStatus(userId, repoId, 'disabled');
    if (repo == null) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ message: 'Repository disabled', repo });
  } catch (error) {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }

    console.error('Error disabling repo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function changeRepoActivityStatus(
  userId: string,
  repoId: string,
  newStatus: 'enabled' | 'disabled',
): Promise<Maybe<GitHubRepo>> {
  const isEnabled = newStatus == 'enabled';

  try {
    return prisma.gitHubRepo.update({
      where: {
        id: repoId,
        installation: {
          client: {
            users: {
              some: {
                userId,
                role: 'ADMIN',
              },
            },
          },
        },
      },
      data: {
        isEnabled,
      },
    });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      console.info(`Failed to update repository ${repoId}: `, error);
      return null;
    }

    throw error;
  }
}

/**
 * GET /api/repos/:repoId
 * Get repo details (must belong to authenticated user)
 */
router.get(
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
        UserRole.SHARED_ACCESS,
      );

      if (access == null) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json({
        id: access.repo.id,
        owner: access.repo.owner,
        fullName: `${access.repo.owner}/${access.repo.name}`,
        isPrivate: access.repo.isPrivate,
        isEnabled: access.repo.isEnabled,
        installation: access.repo.installationId,
        createdAt: access.repo.createdAt,
        updatedAt: access.repo.updatedAt,
      });
    } catch (error) {
      console.error('Error getting repo:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;

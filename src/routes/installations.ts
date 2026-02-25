import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';
import { getInstallationOctokit } from '../services/github/auth';
import { backfillRepo } from '../services/sync';
import { UserRole } from '@prisma/client';

const router = Router();

/**
 * POST /api/installations/:installationId/sync
 * Manually sync repositories for an installation (fetches all repos from GitHub)
 */
router.post(
  '/installations/:installationId/sync',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      if (userId == null) {
        return res.status(401).json({ error: 'Access denied' });
      }

      const installationId = req.params.installationId;

      const access = await prisma.userRoleForClient.findFirst({
        where: {
          userId,
          client: {
            githubInstallationId: installationId,
          },
          role: UserRole.ADMIN,
        },
        include: {
          client: {
            include: {
              githubInstallation: true,
            },
          },
        },
      });

      if (access == null) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (access.client.githubInstallation == null) {
        // NOTE: This should be unreachable. Either access with repository should be found, or access should be null.
        //       Leaving as a sanity check.
        return res.status(500).json({
          error:
            'Bad query: Access to installation found, but installation is missing',
        });
      }

      // Fetch all repositories from GitHub
      const octokit = await getInstallationOctokit(
        access.client.githubInstallation.githubId,
      );
      const response =
        await octokit.rest.apps.listReposAccessibleToInstallation({
          per_page: 100,
        });

      let syncedRepos = 0;
      const reposToBackfill: { id: string; githubId: number; name: string }[] =
        [];

      // Process each repository
      for (const repo of response.data.repositories) {
        try {
          const existingRepo = await prisma.gitHubRepo.findUnique({
            where: { githubId: repo.id },
          });

          const createdRepo = await prisma.gitHubRepo.upsert({
            where: {
              githubId: repo.id,
            },
            create: {
              installationId: installationId,
              owner: repo.owner.login,
              name: repo.name,
              githubId: repo.id,
              isPrivate: repo.private,
              isEnabled: true,
            },
            update: {
              isPrivate: repo.private,
            },
          });

          syncedRepos++;
          console.log(`Repo synced: ${repo.owner.login}/${repo.name}`);

          // If this is a new repo, schedule backfill
          if (!existingRepo) {
            reposToBackfill.push({
              id: createdRepo.id,
              githubId: createdRepo.githubId,
              name: createdRepo.name,
            });
          }
        } catch (error) {
          console.error(
            `Error processing repo ${repo.owner.login}/${repo.name}:`,
            error,
          );
        }
      }

      // Trigger backfill for new repos
      const backfilledRepositories: unknown[] = [];
      await Promise.all(
        reposToBackfill.map(async (repoView) => {
          try {
            await backfillRepo(repoView.id);
            backfilledRepositories.push(repoView);
          } catch (error) {
            console.error(`Error backfilling repo ${repoView.id}: `, error);
          }
        }),
      );

      res.json({
        message: 'Repositories synced successfully',
        synced: syncedRepos,
        backfilled: backfilledRepositories,
      });
    } catch (error) {
      console.error('Error syncing installation repositories:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;

import { Router, Request, Response } from 'express';
import { getInstallationOctokit } from '../services/github/auth';
import { prisma } from '../db';

const router = Router();

/**
 * GET /api/clients/:clientId/repos
 * List all repos for a client
 */
router.get('/clients/:clientId/repos', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const repos = await prisma.gitHubRepo.findMany({
      where: { clientId },
      include: {
        installation: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(repos.map((repo: any) => ({
      id: repo.id,
      owner: repo.owner,
      name: repo.name,
      fullName: `${repo.owner}/${repo.name}`,
      isPrivate: repo.isPrivate,
      isEnabled: repo.isEnabled,
      installation: {
        id: repo.installation.id,
        accountLogin: repo.installation.accountLogin,
      },
      createdAt: repo.createdAt,
      updatedAt: repo.updatedAt,
    })));
  } catch (error) {
    console.error('Error listing repos:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/installations/:installationId/repos
 * List available repos for an installation (from GitHub)
 */
router.get('/installations/:installationId/repos', async (req: Request, res: Response) => {
  try {
    const installationId = parseInt(req.params.installationId, 10);

    const installation = await prisma.gitHubInstallation.findUnique({
      where: { installationId },
    });

    if (!installation) {
      return res.status(404).json({ error: 'Installation not found' });
    }

    const octokit = await getInstallationOctokit(installationId);
    const response = await octokit.rest.apps.listReposAccessibleToInstallation({
      per_page: 100,
    });

    const repos = response.data.repositories.map(repo => ({
      id: repo.id,
      owner: repo.owner.login,
      name: repo.name,
      fullName: repo.full_name,
      isPrivate: repo.private,
      description: repo.description,
      defaultBranch: repo.default_branch,
    }));

    res.json(repos);
  } catch (error) {
    console.error('Error listing installation repos:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/repos/:repoId/enable
 * Enable a repo for syncing
 */
router.post('/repos/:repoId/enable', async (req: Request, res: Response) => {
  try {
    const { repoId } = req.params;

    const repo = await prisma.gitHubRepo.update({
      where: { id: repoId },
      data: { isEnabled: true },
    });

    res.json({ message: 'Repo enabled', repo });
  } catch (error) {
    console.error('Error enabling repo:', error);
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

    const repo = await prisma.gitHubRepo.update({
      where: { id: repoId },
      data: { isEnabled: false },
    });

    res.json({ message: 'Repo disabled', repo });
  } catch (error) {
    console.error('Error disabling repo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/repos/:repoId
 * Get repo details
 */
router.get('/repos/:repoId', async (req: Request, res: Response) => {
  try {
    const { repoId } = req.params;

    const repo = await prisma.gitHubRepo.findUnique({
      where: { id: repoId },
      include: {
        installation: true,
        _count: {
          select: {
            dailySummaries: true,
            syncRuns: true,
          },
        },
      },
    });

    if (!repo) {
      return res.status(404).json({ error: 'Repo not found' });
    }

    res.json({
      id: repo.id,
      owner: repo.owner,
      name: repo.name,
      fullName: `${repo.owner}/${repo.name}`,
      isPrivate: repo.isPrivate,
      isEnabled: repo.isEnabled,
      installation: {
        id: repo.installation.id,
        accountLogin: repo.installation.accountLogin,
      },
      counts: {
        summaries: repo._count.dailySummaries,
        syncRuns: repo._count.syncRuns,
      },
      createdAt: repo.createdAt,
      updatedAt: repo.updatedAt,
    });
  } catch (error) {
    console.error('Error getting repo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

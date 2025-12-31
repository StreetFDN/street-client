import { Router, Request, Response } from 'express';
import { prisma } from '../db';

const router = Router();

/**
 * GET /api/clients/:clientId/installations
 * List GitHub installations for a client
 */
router.get('/clients/:clientId/installations', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const installations = await prisma.githubInstallation.findMany({
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
      installations.map(inst => ({
        id: inst.id,
        installationId: inst.installationId,
        accountLogin: inst.accountLogin,
        repoCount: inst._count.repos,
        createdAt: inst.createdAt,
      }))
    );
  } catch (error) {
    console.error('Error listing installations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/installations
 * List all installations
 */
router.get('/installations', async (req: Request, res: Response) => {
  try {
    const installations = await prisma.githubInstallation.findMany({
      where: {
        revokedAt: null,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
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
      installations.map(inst => ({
        id: inst.id,
        installationId: inst.installationId,
        accountLogin: inst.accountLogin,
        client: inst.client,
        repoCount: inst._count.repos,
        createdAt: inst.createdAt,
      }))
    );
  } catch (error) {
    console.error('Error listing installations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

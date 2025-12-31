import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * GET /api/clients
 * List clients for the authenticated user
 */
router.get('/clients', requireAuth, async (req: Request, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      where: {
        userId: req.userId || undefined,
      },
      include: {
        _count: {
          select: {
            installations: true,
            repos: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(
      clients.map(client => ({
        id: client.id,
        name: client.name,
        counts: {
          installations: client._count.installations,
          repos: client._count.repos,
        },
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
      }))
    );
  } catch (error) {
    console.error('Error listing clients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/clients/:clientId
 * Get client details (must belong to authenticated user)
 */
router.get('/clients/:clientId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const client = await prisma.client.findFirst({
      where: { 
        id: clientId,
        userId: req.userId || undefined,
      },
      include: {
        installations: {
          include: {
            _count: {
              select: {
                repos: true,
              },
            },
          },
        },
        repos: {
          include: {
            installation: true,
          },
        },
        _count: {
          select: {
            installations: true,
            repos: true,
          },
        },
      },
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({
      id: client.id,
      name: client.name,
      installations: client.installations.map(inst => ({
        id: inst.id,
        installationId: inst.installationId,
        accountLogin: inst.accountLogin,
        repoCount: inst._count.repos,
      })),
      repoCount: client._count.repos,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    });
  } catch (error) {
    console.error('Error getting client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/clients
 * Create a new client for the authenticated user
 */
router.post('/clients', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const client = await prisma.client.create({
      data: { 
        name,
        userId: req.userId!,
      },
    });

    res.status(201).json(client);
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

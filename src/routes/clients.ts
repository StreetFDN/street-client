import { Router, Request, Response } from 'express';
import { z } from 'zod';

import { prisma } from 'db';
import { requireAuth } from 'middleware/auth';
import { findUserAccessToClient } from 'utils/db';
import { CreateClientSchema } from 'types/routes/clients';
import { UserRole } from '@prisma/client';

const router = Router();

/**
 * GET /api/clients
 * List clients for the authenticated user
 */
router.get('/clients', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const accesses = await prisma.userRoleForClient.findMany({
      where: {
        userId,
      },
      include: {
        client: true,
      },
    });

    res.json(
      accesses.map((access) => {
        const client = access.client;
        return {
          id: client.id,
          name: client.name,
          role: access.role,
          createdAt: client.createdAt,
          updatedAt: client.updatedAt,
        };
      }),
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
router.get(
  '/clients/:clientId',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const { clientId } = req.params;

      const access = await findUserAccessToClient(
        userId,
        clientId,
        UserRole.USER,
        {
          client: {
            githubInstallation: {
              include: {
                creator: true,
                _count: {
                  select: {
                    repos: true,
                  },
                },
              },
            },
          },
        },
      );

      if (access == null) {
        return res.status(403).json({ error: 'Access Denied ' });
      }

      const client = access.client;
      const installation = client.githubInstallation;

      res.json({
        id: access.client.id,
        name: access.client.name,
        installation:
          installation != null
            ? {
                id: installation.id,
                githubId: installation.githubId,
                accountLogin: installation.creator.login,
                repoCount: installation._count.repos,
              }
            : null,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
      });
    } catch (error) {
      console.error('Error getting client:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

/**
 * POST /api/clients
 * Create a new client for the authenticated user
 */
router.post('/clients', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (userId == null) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (user == null || !user.superUser) {
      return res.status(403).json('Access denied');
    }

    const parsed = CreateClientSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: z.treeifyError(parsed.error),
      });
    }
    const payload = parsed.data;

    const newAdmin = await prisma.user.findUnique({
      where: {
        email: payload.administratorEmail,
      },
    });

    if (newAdmin == null) {
      return res
        .status(400)
        .json({ error: 'Invalid administratorEmail: User does not exists' });
    }

    const client = await prisma.client.create({
      data: {
        name: payload.name,
        users: {
          create: {
            userId: newAdmin.id,
            role: UserRole.ADMIN,
          },
        },
      },
    });

    res.status(201).json(client);
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

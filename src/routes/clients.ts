import { Router, Request, Response } from 'express';
import { z } from 'zod';

import { prisma } from 'db';
import { requireAuth } from 'middleware/auth';
import { findUserAccessToClient, RoleToValue } from 'utils/db';
import {
  CreateClientSchema,
  GrantClientAccessSchema,
  InviteClientMemberSchema,
  RemoveClientMemberSchema,
  RevokeClientAccessSchema,
} from 'types/routes/clients';
import { Prisma, UserRole } from '@prisma/client';

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

    const highestByClientId = new Map<
      string,
      { client: (typeof accesses)[number]['client']; role: UserRole }
    >();

    for (const access of accesses) {
      const existing = highestByClientId.get(access.clientId);
      if (
        existing == null ||
        RoleToValue[access.role] > RoleToValue[existing.role]
      ) {
        highestByClientId.set(access.clientId, {
          client: access.client,
          role: access.role,
        });
      }
    }

    res.json(
      Array.from(highestByClientId.values()).map(({ client, role }) => ({
        id: client.id,
        name: client.name,
        role,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
      })),
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

router.post(
  '/clients/:clientId/inviteMember',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const userId = req.userId;

      if (userId == null) {
        return res.status(401).json({ error: 'Access denied' });
      }

      const parsed = InviteClientMemberSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Invalid request',
          details: z.treeifyError(parsed.error),
        });
      }

      const payload = parsed.data;

      const access = await findUserAccessToClient(
        userId,
        clientId,
        UserRole.ADMIN,
      );
      if (access == null) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const invitedUser = await prisma.user.findUnique({
        where: {
          email: payload.email,
        },
        include: {
          clients: {
            where: {
              clientId,
              sharedAccessId: { equals: null },
            },
          },
        },
      });

      if (invitedUser == null) {
        return res.status(404).json({ error: 'User does not exist' });
      }

      await prisma.$transaction(async (txn) => {
        const existingDirectRole = invitedUser.clients.find(
          (client) =>
            client.clientId === clientId && client.sharedAccessId === null,
        );

        if (existingDirectRole != null) {
          if (
            RoleToValue[existingDirectRole.role] < RoleToValue[payload.role]
          ) {
            await txn.userRoleForClient.update({
              where: {
                id: existingDirectRole.id,
              },
              data: {
                role: payload.role,
              },
            });

            // The role was just updated, no need to recreate shared accesses.
            return;
          }
        }

        await prisma.userRoleForClient.create({
          data: {
            userId: invitedUser.id,
            clientId,
            role: payload.role,
          },
        });

        const sharedAccesses = await txn.sharedClientAccess.findMany({
          where: {
            recipientId: clientId,
          },
          select: {
            id: true,
            sharerId: true,
          },
        });

        await txn.userRoleForClient.createMany({
          data: sharedAccesses.map((sharedAccess) => ({
            userId: invitedUser.id,
            clientId: sharedAccess.sharerId,
            role: UserRole.SHARED_ACCESS,
            sharedAccessId: sharedAccess.id,
          })),
          skipDuplicates: true,
        });
      });

      return res.status(201).json({ status: 'ok' });
    } catch (error) {
      console.error('Failed to invite member: ', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
);

router.post(
  '/clients/:clientId/removeMember',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const userId = req.userId;

      if (userId == null) {
        return res.status(401).json({ error: 'Access denied' });
      }

      const parsed = RemoveClientMemberSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Invalid request',
          details: z.treeifyError(parsed.error),
        });
      }

      const payload = parsed.data;

      const access = await findUserAccessToClient(
        userId,
        clientId,
        UserRole.ADMIN,
      );
      if (access == null) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const targetUser = await prisma.user.findUnique({
        where: {
          email: payload.email,
        },
      });

      if (targetUser == null) {
        return res.status(404).json({ error: 'User does not exist' });
      }

      if (targetUser.id === userId) {
        return res
          .status(400)
          .json({ error: 'Cannot remove yourself from client' });
      }

      const result = await prisma.$transaction(async (txn) => {
        const directRoles = await txn.userRoleForClient.findMany({
          where: {
            userId: targetUser.id,
            clientId,
            role: {
              in: [UserRole.ADMIN, UserRole.USER],
            },
          },
        });

        if (directRoles.length === 0) {
          return {
            error: { status: 404, message: 'User is not a client member' },
          };
        }

        if (directRoles.some((role) => role.role === UserRole.ADMIN)) {
          const remainingAdmins = await txn.userRoleForClient.count({
            where: {
              clientId,
              role: UserRole.ADMIN,
              userId: {
                not: targetUser.id,
              },
            },
          });

          if (remainingAdmins === 0) {
            return {
              error: {
                status: 400,
                message: 'Client must have at least one admin',
              },
            };
          }
        }

        await txn.userRoleForClient.deleteMany({
          where: {
            userId: targetUser.id,
            clientId,
            role: {
              in: [UserRole.ADMIN, UserRole.USER],
            },
          },
        });

        // Recreate shared accesses for the client.
        const sharedAccesses = await txn.sharedClientAccess.findMany({
          where: {
            sharerId: clientId,
          },
          select: {
            id: true,
            recipientId: true,
          },
        });

        if (sharedAccesses.length === 0) {
          return { ok: true };
        }

        const recipientIds = sharedAccesses.map(
          (sharedAccess) => sharedAccess.recipientId,
        );
        const memberships = await txn.userRoleForClient.findMany({
          where: {
            userId: targetUser.id,
            clientId: {
              in: recipientIds,
            },
            role: {
              in: [UserRole.ADMIN, UserRole.USER],
            },
          },
          select: {
            clientId: true,
          },
        });

        if (memberships.length === 0) {
          return { ok: true };
        }

        const membershipIds = new Set(
          memberships.map((membership) => membership.clientId),
        );
        const toCreate = sharedAccesses
          .filter((sharedAccess) => membershipIds.has(sharedAccess.recipientId))
          .map((sharedAccess) => ({
            userId: targetUser.id,
            clientId,
            role: UserRole.SHARED_ACCESS,
            sharedAccessId: sharedAccess.id,
          }));

        if (toCreate.length > 0) {
          await txn.userRoleForClient.createMany({
            data: toCreate,
            skipDuplicates: true,
          });
        }

        return { ok: true };
      });

      if (result?.error != null) {
        return res
          .status(result.error.status)
          .json({ error: result.error.message });
      }

      return res.status(204).end();
    } catch (error) {
      console.log('Failed to remove member: ', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
);

router.post(
  '/clients/:clientId/shareAccess',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const userId = req.userId;

      if (userId == null) {
        return res.status(401).json({ error: 'Access denied' });
      }

      const parsed = GrantClientAccessSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: 'Invalid request',
          details: z.treeifyError(parsed.error),
        });
      }

      const payload = parsed.data;

      const access = await findUserAccessToClient(
        userId,
        clientId,
        UserRole.ADMIN,
      );
      if (access == null) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await prisma.$transaction(async (txn) => {
        const newSharedAccess = await txn.sharedClientAccess.create({
          data: {
            sharerId: access.client.id,
            recipientId: payload.recipientId,
          },
        });

        const affectedUsers = await txn.userRoleForClient.findMany({
          where: {
            clientId: payload.recipientId,
            role: {
              in: [UserRole.ADMIN, UserRole.USER],
            },
          },
          select: {
            userId: true,
          },
        });

        const uniqueUserIds = Array.from(
          new Set(affectedUsers.map((access) => access.userId)),
        );

        if (uniqueUserIds.length === 0) {
          return;
        }

        const existingHigherRoles = await txn.userRoleForClient.findMany({
          where: {
            userId: {
              in: uniqueUserIds,
            },
            clientId,
            role: {
              in: [UserRole.ADMIN, UserRole.USER],
            },
          },
          select: {
            userId: true,
          },
        });

        const usersWithHigherAccess = new Set(
          existingHigherRoles.map((access) => access.userId),
        );

        const newAccesses = uniqueUserIds
          .filter((userId) => !usersWithHigherAccess.has(userId))
          .map((userId) => ({
            userId,
            clientId,
            sharedAccessId: newSharedAccess.id,
            role: UserRole.SHARED_ACCESS,
          }));

        if (newAccesses.length === 0) {
          return;
        }

        await txn.userRoleForClient.createMany({
          data: newAccesses,
          skipDuplicates: true,
        });
      });

      return res.status(201).json({ status: 'ok' });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          return res
            .status(404)
            .json({ error: 'Client does not exists', details: req.body });
        }
      }
      console.error(`Failed to share access: `, error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
);

router.post(
  '/clients/:clientId/revokeAccess',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const userId = req.userId;

      if (userId == null) {
        return res.status(401).json({ error: 'Access denied' });
      }

      const parsed = RevokeClientAccessSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Invalid request',
          details: z.treeifyError(parsed.error),
        });
      }
      const payload = parsed.data;

      const access = await findUserAccessToClient(
        userId,
        clientId,
        UserRole.ADMIN,
      );
      if (access == null) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await prisma.sharedClientAccess.delete({
        where: {
          sharerId_recipientId: {
            sharerId: clientId,
            recipientId: payload.revokedId,
          },
        },
      });

      return res.status(204).end();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return res.status(404).json({
            error: 'No access granted, to be revoked',
            details: req.body,
          });
        }
      }
      console.log('Failed to revoke access: ', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;

import { Request, Response, Router } from 'express';
import { z } from 'zod';

import { prisma } from 'db';
import { requireAuth } from 'middleware/auth';
import { findUserAccessToClient } from 'utils/db';
import { ClientTokenSchema } from 'types/routes/token';
import { Prisma, UserRole } from '@prisma/client';

const router = Router();

/**
 * GET /api/clients/:clientId/tokens
 * List tokens tracked by the client.
 */
router.get(
  '/clients/:clientId/tokens',
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

      const tokens = await prisma.clientTokens.findMany({
        where: {
          clientId,
        },
        include: {
          token: true,
        },
      });

      return res.json(
        tokens.map((entry) => ({
          id: entry.token.id,
          address: entry.token.address,
        })),
      );
    } catch (error) {
      console.error('Error listing client tokens:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
);

/**
 * POST /api/clients/:clientId/token
 * Add token tracking for a client (create token if needed).
 */
router.post(
  '/clients/:clientId/token',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const userId = req.user!.id;

      if (userId == null) {
        return res.status(401).json({ error: 'Access denied' });
      }

      const parsed = ClientTokenSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Invalid request',
          details: z.treeifyError(parsed.error),
        });
      }

      const newToken = parsed.data;

      const access = await findUserAccessToClient(
        userId,
        clientId,
        UserRole.ADMIN,
      );
      if (access == null) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const address = newToken.address.trim().toLowerCase();

      const token = await prisma.$transaction(async (txn) => {
        const existingToken = await txn.token.findFirst({
          where: {
            address,
          },
        });

        const tokenRow =
          existingToken ??
          (await txn.token.create({
            data: {
              address,
              chainId: newToken.chainId,
            },
          }));

        await txn.clientTokens.upsert({
          where: {
            clientId_tokenId: {
              clientId,
              tokenId: tokenRow.id,
            },
          },
          update: {},
          create: {
            clientId,
            tokenId: tokenRow.id,
          },
        });

        return tokenRow;
      });

      return res.status(201).json({
        id: token.id,
        address: token.address,
        createdAt: token.createdAt,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          return res
            .status(404)
            .json({ error: 'Client does not exist', details: req.body });
        }
      }
      console.error('Error adding client token:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
);

/**
 * DELETE /api/clients/:clientId/token
 * Remove token tracking for a client (delete token if unused).
 */
router.delete(
  '/clients/:clientId/token',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const userId = req.user!.id;

      if (userId == null) {
        return res.status(401).json({ error: 'Access denied' });
      }

      const parsed = ClientTokenSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Invalid request',
          details: z.treeifyError(parsed.error),
        });
      }

      const access = await findUserAccessToClient(
        userId,
        clientId,
        UserRole.ADMIN,
      );
      if (access == null) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const address = parsed.data.address.trim().toLowerCase();

      const result = await prisma.$transaction(async (txn) => {
        const token = await txn.token.findFirst({
          where: {
            address,
          },
        });

        if (token == null) {
          return { error: { status: 404, message: 'Token not found' } };
        }

        const removed = await txn.clientTokens.deleteMany({
          where: {
            clientId,
            tokenId: token.id,
          },
        });

        if (removed.count === 0) {
          return {
            error: { status: 404, message: 'Token not tracked for client' },
          };
        }

        const remaining = await txn.clientTokens.count({
          where: {
            tokenId: token.id,
          },
        });

        if (remaining === 0) {
          await txn.token.delete({
            where: {
              id: token.id,
            },
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
      console.error('Error removing client token:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;

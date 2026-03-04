import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';
import { prisma } from '../db';
import { config } from '../config';

const router = Router();

router.get('/users/superUser', requireAuth, async (req, res) => {
  if (!req.user!.isSuperUser) {
    return res.status(403).json({ error: 'Access Denied' });
  }

  const superUsers = await prisma.user.findMany({
    where: {
      superUser: true,
    },
  });

  const payload = superUsers.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
  }));

  return res.status(200).json(payload);
});

const MakeSuperUserSchema = z
  .object({
    superUser: z.coerce.boolean(),
    email: z.coerce.string(),
  })
  .strict();

router.post('/users/superUser', requireAuth, async (req, res) => {
  const parsed = MakeSuperUserSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid request body.',
      details: z.treeifyError(parsed.error),
    });
  }

  if (!req.user!.isSuperUser) {
    return res.status(403).json({ error: 'Access Denied' });
  }

  if (config.admin.superUserEmails.has(parsed.data.email)) {
    return res.status(400).json({
      error:
        'SuperUser set on application level. To change the status, update the ENV VAR "ADMIN_SUPERUSER_EMAIL"',
    });
  }

  try {
    const result = await prisma.user.updateMany({
      where: {
        email: parsed.data.email,
      },
      data: {
        superUser: parsed.data.superUser,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'No user with such email exists' });
    } else {
      return res.status(200).json({ ok: true });
    }
  } catch (error) {
    console.error('Failed to update superUser status:', error);
    return res.status(500).json({ error: 'Failed to update user status' });
  }
});

export default router;

import { registry } from 'docs/registry';
import { AuthenticatedUserSchema } from 'docs/schema/authenticatedUser';
import { Router, Request, Response } from 'express';
import { requireAuth } from 'middleware/auth';

const router = Router();

registry.registerPath({
  method: 'get',
  path: '/api/auth/me',
  tags: ['Auth'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Authenticated user',
      content: {
        'application/json': {
          schema: AuthenticatedUserSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
    },
  },
});
router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.status(200).json(req.user!);
});

export default router;

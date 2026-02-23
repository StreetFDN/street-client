import { Router, Request, Response } from 'express';
import { requireAuth } from 'middleware/auth';

const router = Router();

/**
 * GET /api/admin/authorization
 * Check if the authenticated user is authorized for superuser access
 */
router.get('/authorization', requireAuth, (req: Request, res: Response) => {
  const user = req.user?.isSuperUser;

  if (!user)
    return res.status(403).json({
      error: 'Access Denied',
    });

  return res.json({
    ok: true,
  });
});

export default router;

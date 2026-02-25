import { Router, Request, Response } from 'express';
import { requireAuth } from 'middleware/auth';

const router = Router();

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.status(200).json(req.user!);
});

export default router;

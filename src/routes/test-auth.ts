import { Router } from 'express';
import { requireAuth } from 'middleware/auth';

const router = Router();

router.get('/', requireAuth, async function (req, res) {
  console.log('Requesting User', req.user);
  return res.json({
    data: 'Hello',
  });
});

export default router;

import { Router } from 'express';
import priceRouter from './price';
import holdersRouter from './holders';
import volumeRouter from './volume';
import manageRouter from './manage';
import { requireTokenExists } from 'middleware/requireTokenExists';
import { requireAuth } from 'middleware/auth';

const router = Router();
router.use(
  '/token/:tokenAddress/price',
  [requireAuth, requireTokenExists],
  priceRouter,
);
router.use(
  '/token/:tokenAddress/holders',
  [requireAuth, requireTokenExists],
  holdersRouter,
);
router.use(
  '/token/:tokenAddress/volume',
  [requireAuth, requireTokenExists],
  volumeRouter,
);
router.use('/', manageRouter);

export default router;

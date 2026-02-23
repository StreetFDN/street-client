import { Router } from 'express';
import priceRouter from './price';
import holdersRouter from './holders';
import volumeRouter from './volume';
import manageRouter from './manage';
import { requireAuth } from 'middleware/auth';
import { requireAuthorizedToken } from 'middleware/authorizedToken';

const router = Router();

router.use(
  '/token/:tokenAddress/price',
  [requireAuth, requireAuthorizedToken],
  priceRouter,
);
router.use(
  '/token/:tokenAddress/holders',
  [requireAuth, requireAuthorizedToken],
  holdersRouter,
);
router.use(
  '/token/:tokenAddress/volume',
  [requireAuth, requireAuthorizedToken],
  volumeRouter,
);
// These are client endpoints, so they have their own middleware in those routes.
router.use('/', manageRouter);

export default router;

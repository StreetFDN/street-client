import { Router } from 'express';
import priceRouter from './price';
import holdersRouter from './holders';
import volumeRouter from './volume';
import manageRouter from './manage';

const router = Router();

router.use('/token/:tokenAddress/price', priceRouter);
router.use('/token/:tokenAddress/holders', holdersRouter);
router.use('/token/:tokenAddress/volume', volumeRouter);
router.use('/', manageRouter);

export default router;

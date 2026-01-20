import { Router } from "express";
import priceRouter from "./price";
import holdersRouter from "./holders";
import volumeRouter from "./volume";

const router = Router();

router.use("/token/:tokenAddress/price", priceRouter);
router.use("/token/:tokenAddress/holders", holdersRouter);
router.use("/token/:tokenAddress/volume", volumeRouter);

export default router;
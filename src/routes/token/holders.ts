import { Router, Request, Response } from "express";
import {
  getTokenHoldersCountHistorical,
  getTokenHoldersCurrent,
  ValidPeriodTokenHoldersCount,
} from "../../services/coingecko";

const router = Router({ mergeParams: true });

router.get("/", async (req: Request, res: Response) => {
  try {
    const { tokenAddress } = req.params;

    const tokenHolders = await getTokenHoldersCurrent(tokenAddress);
    return res.json({ data: tokenHolders });
  } catch (error) {
    console.error("Error fetching token holders:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/history", async (req: Request, res: Response) => {
  try {
    const { tokenAddress } = req.params;
    const { period } = req.query;

    const periodValue = ValidPeriodTokenHoldersCount.safeParse(period);
    if (periodValue.error) {
      console.log("Bad value for period", periodValue.error);
      return res.status(400).json({
        error: "Invalid data for period. Expected Value: 7d | 30d | max",
      });
    }

    const tokenHoldersList = await getTokenHoldersCountHistorical(
      tokenAddress,
      periodValue.data
    );

    return res.json({data: tokenHoldersList});
  } catch (error) {
    console.error("Error fetching historical token holders:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

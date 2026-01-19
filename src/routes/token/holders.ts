import { Router, Request, Response } from "express";
import {
  getTokenHoldersCountHistorical,
  ValidPeriodTokenHoldersCount,
} from "../../services/coingecko";

const router = Router({ mergeParams: true });

router.get("/", async (req: Request, res: Response) => {
  try {
    const { tokenAddress } = req.params;

    const tokenHoldersList = await getTokenHoldersCountHistorical(
      tokenAddress,
      "7"
    );
    const [lastUpdated, tokenHoldersCount] = tokenHoldersList.holders[tokenHoldersList.holders.length - 1]

    // TODO: Add distribution % of token holders. ie Whales (>1% holders)
    // 'https://pro-api.coingecko.com/api/v3/onchain/networks/eth/tokens/0xdac17f958d2ee523a2206206994597c13d831ec7/info'
    // This endpoint has details of holders and distribution too

    return res.json({
      total_holders: tokenHoldersCount,
      last_updated: lastUpdated,
    });
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
        error: "Invalid data for period",
      });
    }

    const tokenHoldersList = await getTokenHoldersCountHistorical(
      tokenAddress,
      periodValue.data
    );

    return res.json(tokenHoldersList);
  } catch (error) {
    console.error("Error fetching historical token holders:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

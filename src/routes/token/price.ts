import { Router, Request, Response } from "express";
import {
  getTokenHistoricalCharts,
  getTokenPrice,
  ValidPeriodTokenHistoricalCharts,
} from "../../services/coingecko";

const router = Router({ mergeParams: true });

router.get("/", async (req: Request, res: Response) => {
  try {
    const { tokenAddress } = req.params;
    // TODO: Cache it with a TTL of 5 minutes
    const tokenPriceObject = await getTokenPrice(tokenAddress);

    return res.json(tokenPriceObject);
  } catch (error) {
    console.error("Error fetching token price:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/history", async (req: Request, res: Response) => {
  try {
    const { tokenAddress } = req.params;

    // TODO: Cache it with a TTL of 5 minutes
    const { period } = req.query;

    const periodValue = ValidPeriodTokenHistoricalCharts.safeParse(period);
    if (periodValue.error) {
      console.log("Bad value for period", periodValue.error);
      return res.status(400).json({
        error: "Invalid data for period",
      });
    }

    const tokenHistoricalCharts = await getTokenHistoricalCharts(
      tokenAddress,
      periodValue.data
    );

    return res.json(tokenHistoricalCharts);
  } catch (error) {
    console.error("Error fetching historical token price:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

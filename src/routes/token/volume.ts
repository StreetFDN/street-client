import { Router, Request, Response } from 'express';
import {
  getTokenHistoricalCharts,
  getTokenVolume,
} from '../../services/coingecko';
import z from 'zod';
import { ValidPeriodTokenHistoricalCharts } from '../../types/routes/token';

const router = Router({ mergeParams: true });

router.get('/', async (req: Request, res: Response) => {
  try {
    const { tokenAddress } = req.params;
    const { period } = req.query;

    const periodValue = z.enum(['24h', '7d', '30d', '1y']).safeParse(period);
    if (periodValue.error) {
      console.log('Bad value for period', periodValue.error);
      return res.status(400).json({
        error: 'Invalid data for period. Expected Value: 24h | 7d | 30d | 1y',
      });
    }

    const tokenVolumeObject = await getTokenVolume(
      tokenAddress,
      periodValue.data,
    );

    return res.json({ data: tokenVolumeObject });
  } catch (error) {
    console.error('Error fetching token Volume:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/history', async (req: Request, res: Response) => {
  try {
    const { tokenAddress } = req.params;
    const { period } = req.query;

    const periodValue = ValidPeriodTokenHistoricalCharts.safeParse(period);
    if (periodValue.error) {
      console.log('Bad value for period', periodValue.error);
      return res.status(400).json({
        error:
          'Invalid data for period. Expected Value: 24h | 7d | 30d | 1y | max',
      });
    }

    const tokenPriceObjectHistorical = await getTokenHistoricalCharts(
      tokenAddress,
      periodValue.data,
    );

    return res.json({
      data: { volume: tokenPriceObjectHistorical.total_volumes },
    });
  } catch (error) {
    console.error('Error fetching token Volume:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
export default router;

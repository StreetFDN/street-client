import z from 'zod';

export type TokenPriceObject = {
  current_price: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  last_updated: number;
};

export type TokenHistoricalChartsObject = {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
};

export const ValidPeriodTokenHistoricalCharts = z.enum([
  '24h',
  '7d',
  '30d',
  '1y',
  'max',
]);

export const TokenVolumeObject = z.object({
  total_volume: z.number(),
  period: z.enum(['24h', '7d', '30d', '1y']),
});
export type TokenVolumeObject = z.infer<typeof TokenVolumeObject>;

export type ValidPeriodTokenHistoricalCharts = z.infer<
  typeof ValidPeriodTokenHistoricalCharts
>;

export const periodToDaysMap: Record<ValidPeriodTokenHistoricalCharts, string> =
  {
    '24h': '1',
    '7d': '7',
    '30d': '30',
    '1y': '365',
    max: 'max',
  };

export type TokenHoldersCurrent = {
  total_holders: number;
  distribution: {
    top_10: string;
    '11_30': string;
    '31_50': string;
    rest: string;
  };
  last_updated: number;
};

export type TokenHoldersCountHistorical = {
  holders: [date: string, holders: number][];
};

export const ValidPeriodTokenHoldersCount = z.enum(['7d', '30d', 'max']);
export type ValidPeriodTokenHoldersCount = z.infer<
  typeof ValidPeriodTokenHoldersCount
>;

export const validPeriodTokenHolderDayMap: Record<
  ValidPeriodTokenHoldersCount,
  string
> = { '7d': '7', '30d': '30', max: 'max' };

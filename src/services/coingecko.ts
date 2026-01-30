import { RedisAdapter, TTL_1_HOUR, TTL_5_MIN } from '../utils/redis';
import {
  periodToDaysMap,
  TokenHistoricalChartsObject,
  TokenHoldersCountHistorical,
  TokenHoldersCurrent,
  TokenPriceObject,
  TokenVolumeObject,
  ValidPeriodTokenHistoricalCharts,
  validPeriodTokenHolderDayMap,
  ValidPeriodTokenHoldersCount,
} from 'types/routes/token';
import { config } from 'config';

export const TokenPriceCache = new RedisAdapter<TokenPriceObject>(
  'tokenPrice_eth:',
);

export const TokenHistoricalChartsCache =
  new RedisAdapter<TokenHistoricalChartsObject>('tokenChart_eth:');

export const TokenVolumeCache = new RedisAdapter<TokenVolumeObject>(
  'tokenVolume_eth:',
);
export const TokenHoldersCache = new RedisAdapter<TokenHoldersCurrent>(
  'tokenHolders_eth:',
);

export const TokenHoldersCountHistoricalCache =
  new RedisAdapter<TokenHoldersCountHistorical>('tokenHoldersHistorical_eth:');

// Wrapper for fetch() with Coingecko API Key as Header
export const coingeckoFetch = (input: string | URL, init?: RequestInit) =>
  fetch(input, {
    ...init,
    headers: {
      'x-cg-pro-api-key': config.coingecko.apiKey,
    },
  });

export const getTokenPrice = async (
  tokenAddress: string,
): Promise<TokenPriceObject> => {
  const cachedValue = await TokenPriceCache.get(tokenAddress);
  if (cachedValue) {
    return cachedValue;
  }

  const fetchResponse = await coingeckoFetch(
    COINGECKO_TOKEN_DATA_BASE_URL(tokenAddress),
  );

  if (!fetchResponse.ok) {
    throw new Error(
      `Failed to fetch token price: ${fetchResponse.status}: ${fetchResponse.statusText}`,
    );
  }
  const response = (await fetchResponse.json()) as {
    market_data: {
      current_price: {
        usd: number;
      };
      price_change_percentage_24h: number;
      price_change_24h_in_currency: {
        usd: number;
      };
      last_updated: string;
    };
  };
  const priceObject = {
    current_price: response.market_data.current_price.usd,
    price_change_24h: response.market_data.price_change_24h_in_currency.usd,
    price_change_percentage_24h:
      response.market_data.price_change_percentage_24h,
    last_updated: new Date(response.market_data.last_updated).getTime(),
  };
  // 5 minute expiry
  await TokenPriceCache.setEx(tokenAddress, TTL_5_MIN, priceObject);
  return priceObject;
};

export const getTokenHistoricalCharts = async (
  tokenAddress: string,
  period: ValidPeriodTokenHistoricalCharts,
): Promise<TokenHistoricalChartsObject> => {
  const cacheKey = `${tokenAddress}_${period}`;
  const cachedValue = await TokenHistoricalChartsCache.get(cacheKey);

  if (cachedValue) {
    return cachedValue;
  }
  const queryParams = new URLSearchParams({
    contract_addresses: tokenAddress,
    vs_currency: 'usd',
    days: periodToDaysMap[period],
  });

  const requestURL = `${COINGECKO_TOKEN_DATA_HISTORICAL_BASE_URL(
    tokenAddress,
  )}?${queryParams.toString()}`;

  const fetchResponse = await coingeckoFetch(requestURL);

  if (!fetchResponse.ok) {
    throw new Error(
      `Failed to fetch token charts: ${fetchResponse.status}: ${fetchResponse.statusText}`,
    );
  }
  const response = (await fetchResponse.json()) as TokenHistoricalChartsObject;

  // 1 hour expiration for historical charts
  await TokenHistoricalChartsCache.setEx(cacheKey, TTL_1_HOUR, response);
  return response;
};

export const getTokenVolume = async (
  tokenAddress: string,
  period: Exclude<ValidPeriodTokenHistoricalCharts, 'max'>,
): Promise<TokenVolumeObject> => {
  const cacheKey = `${tokenAddress}_${period}`;
  const cachedValue = await TokenVolumeCache.get(cacheKey);
  if (cachedValue) {
    return cachedValue;
  }
  const tokenHistoricalVolumeForPeriod = await getTokenHistoricalCharts(
    tokenAddress,
    period,
  );
  const [volumes, length] = [
    tokenHistoricalVolumeForPeriod.total_volumes,
    tokenHistoricalVolumeForPeriod.total_volumes.length,
  ];

  // 24 hour volume is on 5 minutes interval each, so we only need the last item which would have the volume of the entire day

  const total_volume = (() => {
    if (period === '24h') {
      return volumes[length - 1][1];
    }

    if (period === '7d' || period === '30d') {
      // Under 90 days, volumes are hour apart. So we'll take the index 0, 24, 48 etc
      let totalVolume = 0;

      // Sample at intervals to get non-overlapping 24-hour periods
      for (let day = 0; day < length; day += 24) {
        totalVolume += volumes[day][1];
      }
      return totalVolume;
    }

    return volumes.reduce((totalVol, item) => totalVol + item[1], 0);
  })();

  // 1 hour expiration for total volume
  await TokenVolumeCache.setEx(cacheKey, TTL_1_HOUR, { total_volume, period });
  return {
    total_volume,
    period,
  };
};

export const getTokenHoldersCurrent = async (
  tokenAddress: string,
): Promise<TokenHoldersCurrent> => {
  const cachedValue = await TokenHoldersCache.get(tokenAddress);
  if (cachedValue) {
    return cachedValue;
  }
  const fetchResponse = await coingeckoFetch(
    COINGECKO_TOP_TOKEN_HOLDERS('eth', tokenAddress),
  );

  if (!fetchResponse.ok) {
    throw new Error(
      `Failed to fetch token holders: ${fetchResponse.status}: ${fetchResponse.statusText}`,
    );
  }
  const response = (await fetchResponse.json()) as {
    data: {
      attributes: {
        holders: {
          count: number;
          // Top 10% holders hold x% of total supply, top 11-30% hold y% of total supply...
          distribution_percentage: {
            top_10: string;
            '11_30': string;
            '31_50': string;
            rest: string;
          };
          last_updated: string;
        };
      };
    };
  };

  const tokenHoldersObject = {
    total_holders: response.data.attributes.holders.count,
    distribution: response.data.attributes.holders.distribution_percentage,
    last_updated: new Date(
      response.data.attributes.holders.last_updated,
    ).getTime(),
  };

  // 1 hour expiration
  await TokenHoldersCache.setEx(tokenAddress, TTL_1_HOUR, tokenHoldersObject);
  return tokenHoldersObject;
};

export const getTokenHoldersCountHistorical = async (
  tokenAddress: string,
  period: ValidPeriodTokenHoldersCount,
): Promise<TokenHoldersCountHistorical> => {
  const cacheKey = `${tokenAddress}_${period}`;
  const cachedValue = await TokenHoldersCountHistoricalCache.get(cacheKey);
  if (cachedValue) {
    return cachedValue;
  }

  const periodValue = validPeriodTokenHolderDayMap[period];
  const searchParams = new URLSearchParams({
    days: periodValue,
  });
  const requestUrl = `${COINGECKO_TOKEN_HOLDERS_COUNT_HISTORICAL_BASE_URL(
    'eth',
    tokenAddress,
  )}?${searchParams.toString()}`;
  const fetchResponse = await coingeckoFetch(requestUrl);

  if (!fetchResponse.ok) {
    throw new Error(
      `Failed to fetch token holders count: ${fetchResponse.status}: ${fetchResponse.statusText}`,
    );
  }
  const response = (await fetchResponse.json()) as {
    data: {
      attributes: {
        token_holders_list: [date: string, holders: number][];
      };
    };
  };

  const holdersObject = {
    holders: response.data.attributes.token_holders_list,
  };

  // 1 hour expiration for holders
  await TokenHoldersCountHistoricalCache.setEx(
    cacheKey,
    TTL_1_HOUR,
    holdersObject,
  );
  return holdersObject;
};

export const COINGECKO_TOKEN_DATA_BASE_URL = (tokenAddress: string) =>
  `https://pro-api.coingecko.com/api/v3/coins/ethereum/contract/${tokenAddress}`;

export const COINGECKO_TOKEN_DATA_HISTORICAL_BASE_URL = (
  tokenAddress: string,
) =>
  `https://pro-api.coingecko.com/api/v3/coins/ethereum/contract/${tokenAddress}/market_chart`;

export const COINGECKO_TOKEN_HOLDERS_COUNT_HISTORICAL_BASE_URL = (
  network: string = 'eth',
  tokenAddress: string,
) =>
  `https://pro-api.coingecko.com/api/v3/onchain/networks/${network}/tokens/${tokenAddress}/holders_chart`;

export const COINGECKO_TOP_TOKEN_HOLDERS = (
  network: string = 'eth',
  tokenAddress: string,
) =>
  `https://pro-api.coingecko.com/api/v3/onchain/networks/${network}/tokens/${tokenAddress}/info`;

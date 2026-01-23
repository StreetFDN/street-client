import { getRedisClient, TTL_1_HOUR, TTL_5_MIN } from "../utils/redis";
import {
  periodToDaysMap,
  TokenHistoricalChartsObject,
  TokenHoldersCountHistorical,
  TokenHoldersCurrent,
  TokenPriceObject,
  ValidPeriodTokenHistoricalCharts,
  validPeriodTokenHolderDayMap,
  ValidPeriodTokenHoldersCount,
} from "../types/routes/token";

// Wrapper for fetch() with Coingecko API Key as Header
export const coingeckoFetch = (input: string | URL, init?: RequestInit) =>
  fetch(input, {
    ...init,
    headers: {
      "x-cg-pro-api-key": process.env.COINGECKO_API_KEY!,
    },
  });

export const getTokenPrice = async (
  tokenAddress: string
): Promise<TokenPriceObject> => {
  const redis = getRedisClient();
  const cacheKey = `tokenPrice_eth:${tokenAddress}`;
  const cachedValue = await redis.get(cacheKey);

  if (cachedValue) {
    return JSON.parse(cachedValue) as TokenPriceObject;
  }

  const fetchResponse = await coingeckoFetch(
    COINGECKO_TOKEN_DATA_BASE_URL(tokenAddress)
  );
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
  await redis.setEx(cacheKey, TTL_5_MIN, JSON.stringify(priceObject));
  return priceObject;
};

export const getTokenHistoricalCharts = async (
  tokenAddress: string,
  period: ValidPeriodTokenHistoricalCharts
): Promise<TokenHistoricalChartsObject> => {
  const redis = getRedisClient();
  const cacheKey = `tokenChart_eth:${tokenAddress}_${period}`;
  const cachedValue = await redis.get(cacheKey);

  if (cachedValue) {
    return JSON.parse(cachedValue) as TokenHistoricalChartsObject;
  }
  const queryParams = new URLSearchParams({
    contract_addresses: tokenAddress,
    vs_currency: "usd",
    days: periodToDaysMap[period],
  });

  const requestURL = `${COINGECKO_TOKEN_DATA_HISTORICAL_BASE_URL(
    tokenAddress
  )}?${queryParams.toString()}`;

  const fetchResponse = await coingeckoFetch(requestURL);
  const response = (await fetchResponse.json()) as TokenHistoricalChartsObject;

  // 1 hour expiration for historical charts
  await redis.setEx(cacheKey, TTL_1_HOUR, JSON.stringify(response));
  return response;
};

export const getTokenVolume = async (
  tokenAddress: string,
  period: Exclude<ValidPeriodTokenHistoricalCharts, "max">
) => {
  const redis = getRedisClient();
  const cacheKey = `tokenVolume_eth:${tokenAddress}_${period}`;
  const cachedValue = await redis.get(cacheKey);
  if (cachedValue) {
    return JSON.parse(cachedValue) as {
      total_volume: number;
      period: Exclude<ValidPeriodTokenHistoricalCharts, "max">;
    };
  }
  const tokenHistoricalVolumeForPeriod = await getTokenHistoricalCharts(
    tokenAddress,
    period
  );
  const [volumes, length] = [
    tokenHistoricalVolumeForPeriod.total_volumes,
    tokenHistoricalVolumeForPeriod.total_volumes.length,
  ];

  // 24 hour volume is on 5 minutes interval each, so we only need the last item which would have the volume of the entire day

  const total_volume = (() => {
    if (period === "24h") {
      return volumes[length - 1][1];
    }

    if (period === "7d" || period === "30d") {
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
  await redis.setEx(
    cacheKey,
    TTL_1_HOUR,
    JSON.stringify({ total_volume, period })
  );
  return {
    total_volume,
    period,
  };
};

export const getTokenHoldersCurrent = async (
  tokenAddress: string
): Promise<TokenHoldersCurrent> => {
  const redis = getRedisClient();
  const cacheKey = `tokenHolders_eth:${tokenAddress}_current`;
  const cachedValue = await redis.get(cacheKey);
  if (cachedValue) {
    return JSON.parse(cachedValue) as TokenHoldersCurrent;
  }
  const fetchResponse = await coingeckoFetch(
    COINGECKO_TOP_TOKEN_HOLDERS("eth", tokenAddress)
  );

  const response = (await fetchResponse.json()) as {
    data: {
      attributes: {
        holders: {
          count: number;
          // Top 10% holders hold x% of total supply, top 11-30% hold y% of total supply...
          distribution_percentage: {
            top_10: string;
            "11_30": string;
            "31_50": string;
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
      response.data.attributes.holders.last_updated
    ).getTime(),
  };

  // 1 hour expiration
  await redis.setEx(cacheKey, TTL_1_HOUR, JSON.stringify(tokenHoldersObject));
  return tokenHoldersObject;
};

export const getTokenHoldersCountHistorical = async (
  tokenAddress: string,
  period: ValidPeriodTokenHoldersCount
): Promise<TokenHoldersCountHistorical> => {
  const redis = getRedisClient();
  const cacheKey = `tokenHolders_eth:${tokenAddress}_${period}`;
  const cachedValue = await redis.get(cacheKey);
  if (cachedValue) {
    return JSON.parse(cachedValue) as TokenHoldersCountHistorical;
  }

  const periodValue = validPeriodTokenHolderDayMap[period];
  const searchParams = new URLSearchParams({
    days: periodValue,
  });
  const requestUrl = `${COINGECKO_TOKEN_HOLDERS_COUNT_HISTORICAL_BASE_URL(
    "eth",
    tokenAddress
  )}?${searchParams.toString()}`;
  const fetchResponse = await coingeckoFetch(requestUrl);
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
  await redis.setEx(cacheKey, TTL_1_HOUR, JSON.stringify(holdersObject));
  return holdersObject;
};

export const COINGECKO_TOKEN_DATA_BASE_URL = (tokenAddress: string) =>
  `https://pro-api.coingecko.com/api/v3/coins/ethereum/contract/${tokenAddress}`;

export const COINGECKO_TOKEN_DATA_HISTORICAL_BASE_URL = (
  tokenAddress: string
) =>
  `https://pro-api.coingecko.com/api/v3/coins/ethereum/contract/${tokenAddress}/market_chart`;

export const COINGECKO_TOKEN_HOLDERS_COUNT_HISTORICAL_BASE_URL = (
  network: string = "eth",
  tokenAddress: string
) =>
  `https://pro-api.coingecko.com/api/v3/onchain/networks/${network}/tokens/${tokenAddress}/holders_chart`;

export const COINGECKO_TOP_TOKEN_HOLDERS = (
  network: string = "eth",
  tokenAddress: string
) =>
  `https://pro-api.coingecko.com/api/v3/onchain/networks/${network}/tokens/${tokenAddress}/info`;

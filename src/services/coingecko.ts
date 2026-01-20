import z from "zod";

// Wrapper for fetch() with Coingecko API Key as Header
export const coingeckoFetch = (input: string | URL, init?: RequestInit) =>
  fetch(input, {
    ...init,
    headers: {
      "x-cg-pro-api-key": process.env.COINGECKO_API_KEY!,
    },
  });

export const getTokenPrice = async (tokenAddress: string) => {
  const response = await coingeckoFetch(
    COINGECKO_TOKEN_DATA_BASE_URL(tokenAddress)
  ).then(
    async (data) =>
      (await data.json()) as {
        market_data: {
          current_price: {
            usd: number;
          };
          price_change_percentage_24h: number;
          price_change_24h_in_currency: {
            usd: number;
          };
          last_updated: number;
        };
      }
  );
  return {
    current_price: response.market_data.current_price.usd,
    price_change_24h: response.market_data.price_change_24h_in_currency.usd,
    price_change_percentage_24h:
      response.market_data.price_change_percentage_24h,
    last_updated: response.market_data.last_updated,
  };
};

export const getTokenHistoricalCharts = async (
  tokenAddress: string,
  period: ValidPeriodTokenHistoricalCharts
) => {
  const queryParams = new URLSearchParams({
    contract_addresses: tokenAddress,
    vs_currency: "usd",
    days: periodToDaysMap[period],
  });

  const requestURL = `${COINGECKO_TOKEN_DATA_HISTORICAL_BASE_URL(
    tokenAddress
  )}?${queryParams.toString()}`;

  const response = await coingeckoFetch(requestURL).then(
    async (data) =>
      (await data.json()) as {
        prices: [number, number][];
        market_caps: [number, number][];
        total_volumes: [number, number][];
      }
  );
  return response;
};

export const ValidPeriodTokenHistoricalCharts = z.enum([
  "24h",
  "7d",
  "30d",
  "1y",
  "max",
]);
export type ValidPeriodTokenHistoricalCharts = z.infer<
  typeof ValidPeriodTokenHistoricalCharts
>;

export const periodToDaysMap = {
  "24h": "1",
  "7d": "7",
  "30d": "30",
  "1y": "365",
  max: "max",
};

export const getTokenVolume = async (
  tokenAddress: string,
  period: Exclude<ValidPeriodTokenHistoricalCharts, "max">
) => {
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
      for (let day = 0; day < length; day+=24) {
        totalVolume += volumes[day][1];
      }
      return totalVolume
    }

    return volumes.reduce((totalVol, item) => totalVol + item[1], 0)
  })();

  // const volume_change_percentage = (volumes[length - 1][1] - volumes[0][1])/volumes[0][1] * 100
  return {
    total_volume,
    // volume_change_percentage,
    period,
  };
};

export const getTokenHoldersCurrent = async (tokenAddress: string) => {
  const response = await coingeckoFetch(
    COINGECKO_TOP_TOKEN_HOLDERS("eth", tokenAddress)
  ).then(
    async (data) =>
      (await data.json()) as {
        data: {
          attributes: {
            holders: {
              count: number;
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
      }
  );
  return {
    total_holders: response.data.attributes.holders.count,
    distribution: response.data.attributes.holders.distribution_percentage,
    last_updated: new Date(response.data.attributes.holders.last_updated).getTime(),
  };
};

export const getTokenHoldersCountHistorical = async (
  tokenAddress: string,
  period: ValidPeriodTokenHoldersCount
) => {
  const searchParams = new URLSearchParams({
    days: period,
  });
  const requestUrl = `${COINGECKO_TOKEN_HOLDERS_COUNT_HISTORICAL_BASE_URL(
    "eth",
    tokenAddress
  )}?${searchParams.toString()}`;
  const response = await coingeckoFetch(requestUrl).then(
    async (data) =>
      (await data.json()) as {
        data: {
          attributes: {
            token_holders_list: [date: string, holders: number][];
          };
        };
      }
  );
  return { holders: response.data.attributes.token_holders_list };
};

export const ValidPeriodTokenHoldersCount = z.enum(["7", "30", "max"]);
export type ValidPeriodTokenHoldersCount = z.infer<
  typeof ValidPeriodTokenHoldersCount
>;

export const COINGECKO_TOKEN_DATA_BASE_URL = (tokenAddress: string) =>
  `https://pro-api.coingecko.com/api/v3/coins/ethereum/contract/${tokenAddress}`;

export const COINGECKO_TOKEN_DATA_HISTORICAL_BASE_URL = (
  tokenAddress: string
) =>
  `https://pro-api.coingecko.com/api/v3/coins/ethereum/contract/${tokenAddress}/market_chart`;

export const COINGECKO_TOKEN_DATA_ONCHAIN_BASE_URL = (tokenAddress: string) =>
  `https://pro-api.coingecko.com/api/v3/onchain/networks/eth/tokens/${tokenAddress}?include_composition=true&include=top_pools`;

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

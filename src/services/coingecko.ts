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
  period: ValidPeriodTokenHistoricalCharts,
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

// export const getTokenVolume = async (
//   tokenAddress: string,
//   period: Exclude<ValidPeriodTokenHistoricalCharts, "max">
// ) => {
//   const tokenHistoricalVolumeForPeriod = await getTokenHistoricalCharts(
//     tokenAddress,
//     period
//   );

//   const total_volume =
//     period === "24h"
//       ? tokenHistoricalVolumeForPeriod.total_volumes[
//           tokenHistoricalVolumeForPeriod.total_volumes.length - 1
//         ][1]
//       : tokenHistoricalVolumeForPeriod.total_volumes.reduce(
//           (acc, item) => acc + item[1],
//           0
//         );

//   const volume_change_percentage = (() => {
//     const [start_volume, end_volume] = [
//       tokenHistoricalVolumeForPeriod.total_volumes[0][1],
//       tokenHistoricalVolumeForPeriod.total_volumes[
//         tokenHistoricalVolumeForPeriod.total_volumes.length - 1
//       ][1],
//     ];
//     return ((end_volume - start_volume) / start_volume) * 100;
//   })();
//   return {
//     total_volume: total_volume,
//     volume_change_percentage: volume_change_percentage,
//     period,
//   };
// };

// export const getTokenHoldersCurrent = async (tokenAddress: string) => {};

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
  `https://pro-api.coingecko.com/api/v3/onchain/networks/${network}/tokens/${tokenAddress}/top_holders`;

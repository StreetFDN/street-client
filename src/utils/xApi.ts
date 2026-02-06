import { config } from 'config';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import { XApiError } from 'utils/errors';
import {
  ApiResponse,
  EndpointByPath,
  Endpoints,
  QueryOf,
  ResponseOf,
} from 'types/xApi';

const X_API_BASE_URL = 'https://api.x.com/2';
const MAX_QUERY_LENGTH = 4096;

const oauth = new OAuth({
  consumer: config.xApi.consumer,
  signature_method: 'HMAC-SHA1',
  hash_function(baseString, key) {
    return crypto.createHmac('sha1', key).update(baseString).digest('base64');
  },
});

/**
 * Fetch well-defined data. As data is well-defined, the query type and return type associated with query is
 * known.
 * @param path Endpoint path (without the '/2' prefix)
 * @param query Query parameter object associated with the specific endpoint
 */
export async function fetchXApi<
  TPath extends Endpoints['path'],
  TEndpoint extends EndpointByPath<Endpoints, TPath> = EndpointByPath<
    Endpoints,
    TPath
  >,
  TQuery extends QueryOf<TEndpoint> = QueryOf<TEndpoint>,
>(path: TPath, query?: TQuery): Promise<ResponseOf<TEndpoint, TQuery>>;

/**
 * Fetch data from endpoint. Data shape is not known
 * @param path Endpoint path (without the '/2' prefix)
 * @param query Query parameters passed as record from string to string or array of strings
 */
export async function fetchXApi(
  path: Exclude<string, Endpoints['path']>,
  query?: Record<string, string | readonly string[]>,
): Promise<ApiResponse<unknown>>;

export async function fetchXApi(
  path: string,
  query?: Record<string, string | readonly string[]>,
): Promise<ApiResponse<unknown>> {
  const url = new URL(`${X_API_BASE_URL}${path}`);
  if (query != null) {
    url.search = new URLSearchParams(query).toString();
  }

  const requestData = {
    url: url.toString(),
    method: 'GET',
  };

  const authHeader = oauth.toHeader(
    oauth.authorize(requestData, config.xApi.token),
  );
  const response = await fetch(url.toString(), {
    method: requestData.method,
    headers: {
      ...authHeader,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new XApiError(
      `X API request GET /2${path} failed`,
      response.status,
      body,
    );
  }

  return (await response.json()) as ApiResponse<unknown>;
}

export function createSearchTweetsQueryBatches(usernames: string[]): string[] {
  const batches: string[] = [];
  let current: string[] = [];
  let currentLength = 2; // parentheses

  for (const username of usernames) {
    const clause = `from:${username}`;
    const separator = current.length === 0 ? '' : ' OR ';
    const candidateLength = currentLength + separator.length + clause.length;

    if (candidateLength > MAX_QUERY_LENGTH && current.length > 0) {
      batches.push(`(${current.join(' OR ')})`);
      current = [clause];
      currentLength = 2 + clause.length;
      continue;
    }

    current.push(clause);
    currentLength = candidateLength;
  }

  if (current.length > 0) {
    batches.push(`(${current.join(' OR ')})`);
  }

  return batches;
}

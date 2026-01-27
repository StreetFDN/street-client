import { createClient } from 'redis';
import {
  TokenHistoricalChartsObject,
  TokenPriceObject,
} from '../types/routes/token';

type RedisClient = ReturnType<typeof createClient>;

let client: RedisClient | null = null;

export async function initRedis(): Promise<void> {
  if (client) {
    console.log('Redis client already initialized');
    return;
  }

  client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error('Redis: Too many reconnection attempts');
          return new Error('Too many reconnection attempts');
        }
        return Math.min(retries * 100, 3000);
      },
    },
  });

  client.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  client.on('connect', () => {
    console.log('Redis client connected');
  });

  client.on('reconnecting', () => {
    console.log('Redis client reconnecting...');
  });

  await client.connect();
  console.log('Redis initialized and ready');
}

/**
 * Gets the Redis client instance
 * Throws error if client is not initialized
 */
export function getRedisClient(): RedisClient {
  if (!client) {
    throw new Error('Redis client not initialized. Call initRedis() first.');
  }
  return client;
}

/**
 * Gracefully closes the Redis connection
 * Should be called on application shutdown
 */
export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
    console.log('Redis connection closed');
  }
}

type Primitive = string | number | boolean;
type Serializable = Primitive | object;

/**
 * A type-safe Redis repository for storing and retrieving data of a specific type.
 * Handles JSON serialization/deserialization and key prefixing automatically.
 *
 * @template T - The type of data this repository will store and retrieve
 *
 * @example
 * ```ts
 * const tokenCache = new RedisAdapter<TokenPriceObject>("token:price:");
 * await tokenCache.setEx("BTC", 3600, { price: 50000, timestamp: Date.now() });
 * const btcData = await tokenCache.get("BTC");
 * ```
 */
export class RedisAdapter<T extends Serializable> {
  prefix: string;
  constructor(prefix: string = '') {
    this.prefix = prefix;
  }

  private getClient(): RedisClient {
    return getRedisClient();
  }

  /**
   * Retrieves a value from Redis by key.
   *
   * @param key - The cache key (will be prefixed automatically)
   * @returns The deserialized value of type T, or null if the key doesn't exist
   */
  async get(key: string): Promise<T | null> {
    const cacheKey = this.prefix + key;
    const cachedValue = await this.getClient().get(cacheKey);
    if (!cachedValue) return null;

    return JSON.parse(cachedValue) as T;
  }

  /**
   * Stores a value in Redis with an expiration time (TTL).
   *
   * @param key - The cache key (will be prefixed automatically)
   * @param ttl - Time to live in seconds
   * @param value - The value to store (will be JSON serialized)
   */
  async setEx(key: string, ttl: number, value: T): Promise<void> {
    const cacheKey = this.prefix + key;
    await this.getClient().setEx(cacheKey, ttl, JSON.stringify(value));
  }

  /**
   * Stores a value in Redis without expiration.
   *
   * @param key - The cache key (will be prefixed automatically)
   * @param value - The value to store (will be JSON serialized)
   */
  async set(key: string, value: T): Promise<void> {
    const cacheKey = this.prefix + key;
    await this.getClient().set(cacheKey, JSON.stringify(value));
  }
}

export const TTL_1_HOUR = 3600;
export const TTL_5_MIN = 300;

import { createClient } from 'redis';

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
      }
    }
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
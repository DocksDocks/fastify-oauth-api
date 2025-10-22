/**
 * Redis Client
 *
 * Singleton Redis client for caching and session management
 */

import Redis from 'ioredis';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

// Create Redis client instance
export const redis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  db: env.REDIS_DB,
  keyPrefix: env.REDIS_KEY_PREFIX,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  enableOfflineQueue: false,
});

// Redis connection event handlers
redis.on('connect', () => {
  logger.info('Redis connected');
});

redis.on('ready', () => {
  logger.info('Redis ready');
});

redis.on('error', (err: Error) => {
  logger.error({ err }, 'Redis error');
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

redis.on('reconnecting', () => {
  logger.info('Redis reconnecting...');
});

// Graceful shutdown
export async function disconnectRedis(): Promise<void> {
  try {
    await redis.quit();
    logger.info('Redis disconnected');
  } catch (error) {
    logger.error({ err: error }, 'Error disconnecting from Redis');
  }
}

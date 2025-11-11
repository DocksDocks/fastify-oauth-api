/**
 * API Key Cache Service
 *
 * Manages caching of API keys in Redis for fast validation
 * Supports 1 active key per platform (ios/android/admin_panel)
 */

import bcrypt from 'bcryptjs';
import { isNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { apiKeys } from '@/db/schema/api-keys';
import { redis } from '@/utils/redis';
import { logger } from '@/utils/logger';
import env from '@/config/env';

// Build full cache key prefix (includes Redis global prefix)
const CACHE_KEY_PREFIX = `${env.REDIS_KEY_PREFIX}api_keys`;
const CACHE_TTL = 3600; // 1 hour

interface CachedApiKey {
  id: number;
  name: string;
  keyHash: string;
}

/**
 * Get all active API keys from database
 */
async function getAllActiveApiKeys(): Promise<CachedApiKey[]> {
  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyHash: apiKeys.keyHash,
    })
    .from(apiKeys)
    .where(isNull(apiKeys.revokedAt));

  return keys;
}

/**
 * Get all cache keys using SCAN
 * When using keyPrefix in ioredis, we need to scan for the pattern WITH the prefix
 * because scanStream applies the prefix automatically
 */
async function getAllCacheKeys(): Promise<string[]> {
  const keys: string[] = [];
  const stream = redis.scanStream({
    match: `${CACHE_KEY_PREFIX}:*`,
    count: 100,
  });

  return new Promise((resolve, reject) => {
    stream.on('data', (resultKeys: string[]) => {
      // resultKeys are returned WITHOUT the keyPrefix by scanStream
      keys.push(...resultKeys);
    });
    stream.on('end', () => {
      logger.debug({
        keysFound: keys.length,
        keys: keys
      }, '[API Key Cache] SCAN completed');
      resolve(keys);
    });
    stream.on('error', (err: Error) => {
      logger.error({ err }, '[API Key Cache] SCAN error');
      reject(err);
    });
  });
}

/**
 * Load all active API keys into Redis cache
 */
export async function refreshApiKeyCache(): Promise<void> {
  try {
    const keys = await getAllActiveApiKeys();

    // Clear existing cache
    const existingKeys = await getAllCacheKeys();
    if (existingKeys.length > 0) {
      await redis.del(...existingKeys);
    }

    // Cache each key
    for (const key of keys) {
      const cacheKey = `${CACHE_KEY_PREFIX}:${key.name}`;
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(key));
      logger.debug({ cacheKey }, '[API Key Cache] Stored key in Redis');
    }

    // Verify keys were stored
    const verifyKeys = await getAllCacheKeys();
    logger.info(
      { count: keys.length, cachedCount: verifyKeys.length, keyNames: verifyKeys },
      `[API Key Cache] Refreshed ${keys.length} active API keys`,
    );
  } catch (error) {
    logger.error({ err: error }, '[API Key Cache] Failed to refresh cache');
    throw error;
  }
}

/**
 * Validate API key against cached keys
 * Returns true if key is valid, false otherwise
 */
export async function validateApiKey(providedKey: string, retried = false): Promise<boolean> {
  try {
    // Get all cached keys using SCAN (works with keyPrefix)
    const cachedKeyNames = await getAllCacheKeys();

    logger.debug({
      cachedKeyNamesCount: cachedKeyNames.length,
      pattern: `${CACHE_KEY_PREFIX}:*`,
      retried
    }, '[API Key Cache] Searching for cached keys');

    if (cachedKeyNames.length === 0) {
      if (retried) {
        // Already tried refreshing once, fail to prevent infinite loop
        logger.error('[API Key Cache] No keys found after refresh, validation failed');
        return false;
      }

      logger.warn('[API Key Cache] No keys in cache, refreshing...');
      await refreshApiKeyCache();
      return validateApiKey(providedKey, true); // Retry once after refresh
    }

    // Check against each cached key
    for (const cacheKey of cachedKeyNames) {
      const cachedData = await redis.get(cacheKey);
      if (!cachedData) continue;

      const apiKey: CachedApiKey = JSON.parse(cachedData);
      const isValid = await bcrypt.compare(providedKey, apiKey.keyHash);

      if (isValid) {
        logger.debug(
          { keyName: apiKey.name },
          '[API Key Cache] Valid API key found',
        );
        return true;
      }
    }

    return false;
  } catch (error) {
    logger.error({ err: error }, '[API Key Cache] Error validating API key');
    return false;
  }
}

/**
 * Initialize cache on server startup
 */
export async function initializeApiKeyCache(): Promise<void> {
  try {
    await refreshApiKeyCache();
    logger.info('[API Key Cache] Initialized successfully');
  } catch (error) {
    logger.error({ err: error }, '[API Key Cache] Failed to initialize');
  }
}

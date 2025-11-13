import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { refreshApiKeyCache, validateApiKey, initializeApiKeyCache } from '@/services/api-key-cache.service';
import { db } from '@/db/client';
import { redis } from '@/utils/redis';
import bcrypt from 'bcryptjs';
import type { Readable } from 'stream';

/**
 * API Key Cache Service Test Suite
 * Tests Redis caching, database fallback, and validation logic
 */

// Mock Redis
vi.mock('@/utils/redis', () => ({
  redis: {
    scanStream: vi.fn(),
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
  },
}));

// Mock database
vi.mock('@/db/client', () => ({
  db: {
    select: vi.fn(),
  },
}));

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
  },
}));

describe('API Key Cache Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('refreshApiKeyCache', () => {
    it('should load active API keys from database into Redis cache', async () => {
      // Mock database response
      const mockKeys = [
        { id: 1, name: 'ios', keyHash: 'hash1' },
        { id: 2, name: 'android', keyHash: 'hash2' },
      ];

      const mockDbSelect = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockKeys),
      };
      vi.mocked(db.select).mockReturnValue(mockDbSelect as unknown as ReturnType<typeof db.select>);

      // Mock Redis scanStream for getting existing keys
      const mockStream = {
        on: vi.fn((event, callback) => {
          if (event === 'data') {
            callback(['fastify:api_keys:old_key']);
          } else if (event === 'end') {
            callback();
          }
          return mockStream;
        }),
      } as unknown as Readable;
      vi.mocked(redis.scanStream).mockReturnValue(mockStream);

      // Mock Redis operations
      vi.mocked(redis.del).mockResolvedValue(1 as never);
      vi.mocked(redis.setex).mockResolvedValue('OK' as never);

      // Execute
      await refreshApiKeyCache();

      // Verify: Should delete old keys
      expect(redis.del).toHaveBeenCalledWith('fastify:api_keys:old_key');

      // Verify: Should cache new keys
      expect(redis.setex).toHaveBeenCalledTimes(2);
      expect(redis.setex).toHaveBeenCalledWith(
        expect.stringContaining('api_keys:ios'),
        3600,
        JSON.stringify(mockKeys[0]),
      );
      expect(redis.setex).toHaveBeenCalledWith(
        expect.stringContaining('api_keys:android'),
        3600,
        JSON.stringify(mockKeys[1]),
      );
    });

    it('should handle empty database (no active keys)', async () => {
      // Mock empty database
      const mockDbSelect = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(db.select).mockReturnValue(mockDbSelect as unknown as ReturnType<typeof db.select>);

      // Mock Redis scanStream - no existing keys
      const mockStream = {
        on: vi.fn((event, callback) => {
          if (event === 'data') {
            // No data
          } else if (event === 'end') {
            callback();
          }
          return mockStream;
        }),
      } as unknown as Readable;
      vi.mocked(redis.scanStream).mockReturnValue(mockStream);

      // Execute
      await refreshApiKeyCache();

      // Verify: Should not delete anything
      expect(redis.del).not.toHaveBeenCalled();

      // Verify: Should not cache anything
      expect(redis.setex).not.toHaveBeenCalled();
    });

    it('should handle Redis SCAN error gracefully', async () => {
      // Mock database
      const mockDbSelect = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ id: 1, name: 'ios', keyHash: 'hash1' }]),
      };
      vi.mocked(db.select).mockReturnValue(mockDbSelect as unknown as ReturnType<typeof db.select>);

      // Mock Redis scanStream with error
      const mockStream = {
        on: vi.fn((event, callback) => {
          if (event === 'error') {
            callback(new Error('Redis SCAN failed'));
          }
          return mockStream;
        }),
      } as unknown as Readable;
      vi.mocked(redis.scanStream).mockReturnValue(mockStream);

      // Execute and verify error is thrown
      await expect(refreshApiKeyCache()).rejects.toThrow('Redis SCAN failed');
    });

    it('should handle database error', async () => {
      // Mock database error
      const mockDbSelect = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockRejectedValue(new Error('Database connection failed')),
      };
      vi.mocked(db.select).mockReturnValue(mockDbSelect as unknown as ReturnType<typeof db.select>);

      // Execute and verify error is thrown
      await expect(refreshApiKeyCache()).rejects.toThrow('Database connection failed');
    });
  });

  describe('validateApiKey', () => {
    it('should return true for valid API key', async () => {
      const validKey = 'valid-api-key';
      const hashedKey = '$2a$10$hashedKeyExample123456789012345678901234567890';

      // Mock Redis scanStream - return cached keys
      const mockStream = {
        on: vi.fn((event, callback) => {
          if (event === 'data') {
            callback(['fastify:api_keys:ios']);
          } else if (event === 'end') {
            callback();
          }
          return mockStream;
        }),
      } as unknown as Readable;
      vi.mocked(redis.scanStream).mockReturnValue(mockStream);

      // Mock Redis get - return cached key data
      vi.mocked(redis.get).mockResolvedValue(
        JSON.stringify({ id: 1, name: 'ios', keyHash: hashedKey }) as never,
      );

      // Mock bcrypt compare - return true for valid key
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      // Execute
      const result = await validateApiKey(validKey);

      // Verify
      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(validKey, hashedKey);
    });

    it('should return false for invalid API key', async () => {
      const invalidKey = 'invalid-api-key';
      const hashedKey = 'some-hash';

      // Mock Redis scanStream
      const mockStream = {
        on: vi.fn((event, callback) => {
          if (event === 'data') {
            callback(['fastify:api_keys:ios']);
          } else if (event === 'end') {
            callback();
          }
          return mockStream;
        }),
      } as unknown as Readable;
      vi.mocked(redis.scanStream).mockReturnValue(mockStream);

      // Mock Redis get
      vi.mocked(redis.get).mockResolvedValue(
        JSON.stringify({ id: 1, name: 'ios', keyHash: hashedKey }) as never,
      );

      // Mock bcrypt compare - return false for invalid key
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      // Execute
      const result = await validateApiKey(invalidKey);

      // Verify
      expect(result).toBe(false);
    });

    it('should check multiple cached keys until match found', async () => {
      const validKey = 'valid-api-key';
      const hash1 = 'hash1';
      const hash2 = '$2a$10$hashedKeyExample123456789012345678901234567890';

      // Mock Redis scanStream - return 2 cached keys
      const mockStream = {
        on: vi.fn((event, callback) => {
          if (event === 'data') {
            callback(['fastify:api_keys:ios', 'fastify:api_keys:android']);
          } else if (event === 'end') {
            callback();
          }
          return mockStream;
        }),
      } as unknown as Readable;
      vi.mocked(redis.scanStream).mockReturnValue(mockStream);

      // Mock Redis get - return different data for each key
      vi.mocked(redis.get)
        .mockResolvedValueOnce(JSON.stringify({ id: 1, name: 'ios', keyHash: hash1 }) as never)
        .mockResolvedValueOnce(JSON.stringify({ id: 2, name: 'android', keyHash: hash2 }) as never);

      // Mock bcrypt compare - first fails, second succeeds
      vi.mocked(bcrypt.compare)
        .mockResolvedValueOnce(false as never)
        .mockResolvedValueOnce(true as never);

      // Execute
      const result = await validateApiKey(validKey);

      // Verify: Should find match on second key
      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledTimes(2);
    });

    it('should refresh cache and retry when no keys found (first attempt)', async () => {
      const validKey = 'valid-api-key';
      const hashedKey = '$2a$10$hashedKeyExample123456789012345678901234567890';

      let callCount = 0;

      // Mock Redis scanStream - first call empty, second call has keys
      vi.mocked(redis.scanStream).mockImplementation(() => {
        callCount++;
        const mockStream = {
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              if (callCount > 1) {
                // After refresh, return keys
                callback(['fastify:api_keys:ios']);
              }
              // First call: no keys (empty data)
            } else if (event === 'end') {
              callback();
            }
            return mockStream;
          }),
        } as unknown as Readable;
        return mockStream;
      });

      // Mock database for refresh
      const mockDbSelect = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ id: 1, name: 'ios', keyHash: hashedKey }]),
      };
      vi.mocked(db.select).mockReturnValue(mockDbSelect as unknown as ReturnType<typeof db.select>);

      // Mock Redis operations for refresh
      vi.mocked(redis.setex).mockResolvedValue('OK' as never);

      // Mock Redis get for validation after refresh
      vi.mocked(redis.get).mockResolvedValue(
        JSON.stringify({ id: 1, name: 'ios', keyHash: hashedKey }) as never,
      );

      // Mock bcrypt compare
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      // Execute
      const result = await validateApiKey(validKey);

      // Verify: Should refresh cache and find key
      expect(result).toBe(true);
      expect(redis.setex).toHaveBeenCalled(); // Cache was refreshed
    });

    it('should return false when no keys found after retry', async () => {
      const validKey = 'valid-api-key';

      // Mock Redis scanStream - always returns empty
      const mockStream = {
        on: vi.fn((event, callback) => {
          if (event === 'data') {
            // No keys
          } else if (event === 'end') {
            callback();
          }
          return mockStream;
        }),
      } as unknown as Readable;
      vi.mocked(redis.scanStream).mockReturnValue(mockStream);

      // Mock database for refresh - empty
      const mockDbSelect = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(db.select).mockReturnValue(mockDbSelect as unknown as ReturnType<typeof db.select>);

      // Execute
      const result = await validateApiKey(validKey);

      // Verify: Should return false after retry
      expect(result).toBe(false);
    });

    it('should handle Redis get returning null', async () => {
      const validKey = 'valid-api-key';

      // Mock Redis scanStream
      const mockStream = {
        on: vi.fn((event, callback) => {
          if (event === 'data') {
            callback(['fastify:api_keys:ios']);
          } else if (event === 'end') {
            callback();
          }
          return mockStream;
        }),
      } as unknown as Readable;
      vi.mocked(redis.scanStream).mockReturnValue(mockStream);

      // Mock Redis get - return null (key expired or deleted)
      vi.mocked(redis.get).mockResolvedValue(null as never);

      // Execute
      const result = await validateApiKey(validKey);

      // Verify: Should return false (no valid key found)
      expect(result).toBe(false);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should handle bcrypt comparison error gracefully', async () => {
      const validKey = 'valid-api-key';

      // Mock Redis scanStream
      const mockStream = {
        on: vi.fn((event, callback) => {
          if (event === 'data') {
            callback(['fastify:api_keys:ios']);
          } else if (event === 'end') {
            callback();
          }
          return mockStream;
        }),
      } as unknown as Readable;
      vi.mocked(redis.scanStream).mockReturnValue(mockStream);

      // Mock Redis get
      vi.mocked(redis.get).mockResolvedValue(
        JSON.stringify({ id: 1, name: 'ios', keyHash: 'hash' }) as never,
      );

      // Mock bcrypt compare - throw error
      vi.mocked(bcrypt.compare).mockRejectedValue(new Error('Bcrypt error'));

      // Execute
      const result = await validateApiKey(validKey);

      // Verify: Should return false on error
      expect(result).toBe(false);
    });

    it('should handle Redis scan error during validation', async () => {
      const validKey = 'valid-api-key';

      // Mock Redis scanStream with error
      const mockStream = {
        on: vi.fn((event, callback) => {
          if (event === 'error') {
            callback(new Error('Redis SCAN error'));
          }
          return mockStream;
        }),
      } as unknown as Readable;
      vi.mocked(redis.scanStream).mockReturnValue(mockStream);

      // Execute
      const result = await validateApiKey(validKey);

      // Verify: Should return false on error
      expect(result).toBe(false);
    });
  });

  describe('initializeApiKeyCache', () => {
    it('should successfully initialize cache on startup', async () => {
      // Mock database
      const mockDbSelect = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ id: 1, name: 'ios', keyHash: 'hash1' }]),
      };
      vi.mocked(db.select).mockReturnValue(mockDbSelect as unknown as ReturnType<typeof db.select>);

      // Mock Redis operations
      const mockStream = {
        on: vi.fn((event, callback) => {
          if (event === 'data') {
            // No existing keys
          } else if (event === 'end') {
            callback();
          }
          return mockStream;
        }),
      } as unknown as Readable;
      vi.mocked(redis.scanStream).mockReturnValue(mockStream);
      vi.mocked(redis.setex).mockResolvedValue('OK' as never);

      // Execute
      await initializeApiKeyCache();

      // Verify: Should call setex to cache keys
      expect(redis.setex).toHaveBeenCalled();
    });

    it('should handle initialization error gracefully', async () => {
      // Mock database error
      const mockDbSelect = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockRejectedValue(new Error('Database error')),
      };
      vi.mocked(db.select).mockReturnValue(mockDbSelect as unknown as ReturnType<typeof db.select>);

      // Execute - should not throw
      await expect(initializeApiKeyCache()).resolves.toBeUndefined();

      // Verify: Error is logged but not thrown
    });
  });
});

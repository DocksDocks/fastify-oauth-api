import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Test suite for Redis client utilities
 * Tests event handlers and graceful shutdown
 *
 * Note: We need to mock Redis before importing the module
 */

// Mock types
interface MockRedis {
  on: ReturnType<typeof vi.fn>;
  quit: ReturnType<typeof vi.fn>;
  emit: ReturnType<typeof vi.fn>;
}

interface MockLogger {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
}

describe('Redis Client', () => {
  let mockRedis: MockRedis;
  let mockLogger: MockLogger;
  let eventHandlers: Map<string, (...args: unknown[]) => void>;

  beforeEach(async () => {
    // Reset event handlers map
    eventHandlers = new Map();

    // Mock logger
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    // Mock Redis client
    mockRedis = {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        eventHandlers.set(event, handler);
        return mockRedis;
      }),
      quit: vi.fn().mockResolvedValue('OK'),
      emit: vi.fn((event: string, ...args: unknown[]) => {
        const handler = eventHandlers.get(event);
        if (handler) {
          handler(...args);
        }
      }),
    };

    // Mock ioredis module
    vi.doMock('ioredis', () => {
      return {
        default: vi.fn(() => mockRedis),
      };
    });

    // Mock logger module
    vi.doMock('@/utils/logger', () => ({
      logger: mockLogger,
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('Event Handlers', () => {
    it('should register connect event handler', async () => {
      // Import module after mocks are set up
      await import('@/utils/redis');

      expect(mockRedis.on).toHaveBeenCalledWith('connect', expect.any(Function));
    });

    it('should log message on connect event', async () => {
      await import('@/utils/redis');

      // Trigger connect event
      const connectHandler = eventHandlers.get('connect');
      expect(connectHandler).toBeDefined();

      connectHandler?.();

      expect(mockLogger.info).toHaveBeenCalledWith('Redis connected');
    });

    it('should register ready event handler', async () => {
      await import('@/utils/redis');

      expect(mockRedis.on).toHaveBeenCalledWith('ready', expect.any(Function));
    });

    it('should log message on ready event', async () => {
      await import('@/utils/redis');

      // Trigger ready event
      const readyHandler = eventHandlers.get('ready');
      expect(readyHandler).toBeDefined();

      readyHandler?.();

      expect(mockLogger.info).toHaveBeenCalledWith('Redis ready');
    });

    it('should register error event handler', async () => {
      await import('@/utils/redis');

      expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should log error on error event', async () => {
      await import('@/utils/redis');

      // Trigger error event
      const errorHandler = eventHandlers.get('error');
      expect(errorHandler).toBeDefined();

      const testError = new Error('Connection failed');
      errorHandler?.(testError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        { err: testError },
        'Redis error'
      );
    });

    it('should register close event handler', async () => {
      await import('@/utils/redis');

      expect(mockRedis.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('should log warning on close event', async () => {
      await import('@/utils/redis');

      // Trigger close event
      const closeHandler = eventHandlers.get('close');
      expect(closeHandler).toBeDefined();

      closeHandler?.();

      expect(mockLogger.warn).toHaveBeenCalledWith('Redis connection closed');
    });

    it('should register reconnecting event handler', async () => {
      await import('@/utils/redis');

      expect(mockRedis.on).toHaveBeenCalledWith('reconnecting', expect.any(Function));
    });

    it('should log message on reconnecting event', async () => {
      await import('@/utils/redis');

      // Trigger reconnecting event
      const reconnectingHandler = eventHandlers.get('reconnecting');
      expect(reconnectingHandler).toBeDefined();

      reconnectingHandler?.();

      expect(mockLogger.info).toHaveBeenCalledWith('Redis reconnecting...');
    });

    it('should register all event handlers on initialization', async () => {
      await import('@/utils/redis');

      // Verify all 5 event handlers are registered
      expect(mockRedis.on).toHaveBeenCalledTimes(5);
      expect(eventHandlers.size).toBe(5);
      expect(eventHandlers.has('connect')).toBe(true);
      expect(eventHandlers.has('ready')).toBe(true);
      expect(eventHandlers.has('error')).toBe(true);
      expect(eventHandlers.has('close')).toBe(true);
      expect(eventHandlers.has('reconnecting')).toBe(true);
    });
  });

  describe('disconnectRedis', () => {
    it('should call quit on redis client', async () => {
      const { disconnectRedis } = await import('@/utils/redis');

      await disconnectRedis();

      expect(mockRedis.quit).toHaveBeenCalledOnce();
    });

    it('should log success message after disconnect', async () => {
      const { disconnectRedis } = await import('@/utils/redis');

      await disconnectRedis();

      expect(mockLogger.info).toHaveBeenCalledWith('Redis disconnected');
    });

    it('should handle quit error gracefully', async () => {
      const testError = new Error('Quit failed');
      mockRedis.quit.mockRejectedValueOnce(testError);

      const { disconnectRedis } = await import('@/utils/redis');

      await disconnectRedis();

      expect(mockLogger.error).toHaveBeenCalledWith(
        { err: testError },
        'Error disconnecting from Redis'
      );
    });

    it('should not throw error when quit fails', async () => {
      mockRedis.quit.mockRejectedValueOnce(new Error('Quit failed'));

      const { disconnectRedis } = await import('@/utils/redis');

      // Should not throw
      await expect(disconnectRedis()).resolves.toBeUndefined();
    });
  });

  describe('Redis Client Configuration', () => {
    it('should create Redis client with correct configuration', async () => {
      const Redis = (await import('ioredis')).default;

      await import('@/utils/redis');

      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          host: expect.any(String),
          port: expect.any(Number),
          db: expect.any(Number),
          retryStrategy: expect.any(Function),
          enableOfflineQueue: false,
        })
      );
    });

    it('should have retry strategy that increases delay', async () => {
      const Redis = (await import('ioredis')).default;

      await import('@/utils/redis');

      const call = (Redis as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0] as {
        retryStrategy: (times: number) => number;
      };
      const retryStrategy = call.retryStrategy;

      // Test retry strategy with different times
      expect(retryStrategy(1)).toBe(50); // 1 * 50
      expect(retryStrategy(2)).toBe(100); // 2 * 50
      expect(retryStrategy(10)).toBe(500); // 10 * 50
      expect(retryStrategy(50)).toBe(2000); // Capped at 2000
      expect(retryStrategy(100)).toBe(2000); // Capped at 2000
    });
  });

  describe('Event Handler Scenarios', () => {
    it('should handle multiple error events', async () => {
      await import('@/utils/redis');

      const errorHandler = eventHandlers.get('error');

      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');

      errorHandler?.(error1);
      errorHandler?.(error2);

      expect(mockLogger.error).toHaveBeenCalledTimes(2);
      expect(mockLogger.error).toHaveBeenNthCalledWith(1, { err: error1 }, 'Redis error');
      expect(mockLogger.error).toHaveBeenNthCalledWith(2, { err: error2 }, 'Redis error');
    });

    it('should handle reconnection cycle events', async () => {
      await import('@/utils/redis');

      // Simulate reconnection cycle: close -> reconnecting -> connect -> ready
      const closeHandler = eventHandlers.get('close');
      const reconnectingHandler = eventHandlers.get('reconnecting');
      const connectHandler = eventHandlers.get('connect');
      const readyHandler = eventHandlers.get('ready');

      closeHandler?.();
      reconnectingHandler?.();
      connectHandler?.();
      readyHandler?.();

      // Verify all events were logged in order
      const infoCalls = mockLogger.info.mock.calls;
      const warnCalls = mockLogger.warn.mock.calls;

      expect(warnCalls[0][0]).toBe('Redis connection closed');
      expect(infoCalls.some((call: unknown[]) => call[0] === 'Redis reconnecting...')).toBe(true);
      expect(infoCalls.some((call: unknown[]) => call[0] === 'Redis connected')).toBe(true);
      expect(infoCalls.some((call: unknown[]) => call[0] === 'Redis ready')).toBe(true);
    });
  });
});

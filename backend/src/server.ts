import { buildApp } from '@/app';
import { env } from '@/config';
import { logger } from '@/utils/logger';
import { initializeApiKeyCache } from '@/services/api-key-cache.service';
import { disconnectRedis } from '@/utils/redis';

const start = async (): Promise<void> => {
  try {
    const app = await buildApp();

    // Graceful shutdown
    const signals = ['SIGINT', 'SIGTERM'] as const;
    signals.forEach((signal) => {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, closing server gracefully...`);
        await disconnectRedis();
        await app.close();
        process.exit(0);
      });
    });

    // Start server
    await app.listen({
      port: Number(env.PORT),
      host: env.HOST,
    });

    // Initialize API key cache after server starts
    await initializeApiKeyCache();

    logger.info({
      message: 'Server started successfully',
      port: env.PORT,
      host: env.HOST,
      environment: env.NODE_ENV,
    });
  } catch (error) {
    logger.error(error, 'Failed to start server');
    process.exit(1);
  }
};

start();

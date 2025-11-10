/**
 * Setup Routes
 *
 * Handles first-time setup wizard:
 * - GET /api/setup/status - Check if setup is complete (NO auth required)
 * - POST /api/setup/initialize - Initialize after first OAuth (JWT only)
 * - POST /api/setup/reset - Reset setup for development (superadmin only)
 */

import type { FastifyInstance } from 'fastify';
import { checkSetupStatus, initializeSetup, resetSetup } from '@/services/setup.service';
import { requireSuperadmin } from '@/middleware/authorize';
import { logger } from '@/utils/logger';

export default async function setupRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/setup/status
   * Check if setup is complete
   * No authentication required
   */
  fastify.get('/api/setup/status', async (_request, reply) => {
    try {
      const status = await checkSetupStatus();

      return reply.send({
        success: true,
        data: status,
      });
    } catch (error) {
      logger.error(error, 'Failed to check setup status');
      return reply.status(500).send({
        success: false,
        error: 'Failed to check setup status',
      });
    }
  });

  /**
   * POST /api/setup/initialize
   * Initialize setup after first OAuth login
   * Requires JWT authentication (but NO API key)
   */
  fastify.post(
    '/api/setup/initialize',
    {
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      try {
        const userId = request.user.id;

        logger.info({ userId }, 'Initializing setup for user');

        // Check if setup is already complete
        const { setupComplete } = await checkSetupStatus();
        if (setupComplete) {
          return reply.status(400).send({
            success: false,
            error: 'Setup is already complete',
          });
        }

        // Initialize setup
        const apiKeys = await initializeSetup(userId);

        return reply.send({
          success: true,
          message: 'Setup completed successfully',
          data: {
            apiKeys: {
              ios: apiKeys.iosApiKey,
              android: apiKeys.androidApiKey,
              web: apiKeys.webApiKey,
            },
          },
        });
      } catch (error) {
        logger.error(error, 'Failed to initialize setup');
        return reply.status(500).send({
          success: false,
          error: 'Failed to initialize setup',
        });
      }
    }
  );

  /**
   * POST /api/setup/reset
   * Reset setup for development (superadmin only)
   * Clears all data and resets setup status
   */
  fastify.post(
    '/api/setup/reset',
    {
      preHandler: [fastify.authenticate, requireSuperadmin],
    },
    async (request, reply) => {
      try {
        logger.warn({ userId: request.user.id }, 'Resetting setup');

        await resetSetup();

        return reply.send({
          success: true,
          message: 'Setup reset successfully. All data has been cleared.',
        });
      } catch (error) {
        logger.error(error, 'Failed to reset setup');
        return reply.status(500).send({
          success: false,
          error: 'Failed to reset setup',
        });
      }
    }
  );
}

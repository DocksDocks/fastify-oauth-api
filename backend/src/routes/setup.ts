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
   * No authentication required (needed for initial setup wizard)
   * SECURITY NOTE: Returns minimal information to reduce disclosure risk
   */
  fastify.get('/api/setup/status', async (_request, reply) => {
    try {
      const status = await checkSetupStatus();

      // In production, only return setupComplete flag to minimize information disclosure
      if (process.env.NODE_ENV === 'production') {
        return reply.send({
          success: true,
          data: {
            setupComplete: status.setupComplete,
          },
        });
      }

      // In development, return full status for debugging
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
   * SECURITY FIX: TOCTOU check moved to service layer with row-level locking
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

        // Initialize setup (setup completion check now done inside transaction)
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

        // Handle setup already complete error
        if (error instanceof Error && error.message.includes('already complete')) {
          return reply.status(400).send({
            success: false,
            error: error.message,
          });
        }

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
   * SECURITY FIX: Blocked in production environment
   */
  fastify.post(
    '/api/setup/reset',
    {
      preHandler: [fastify.authenticate, requireSuperadmin],
    },
    async (request, reply) => {
      try {
        // SECURITY FIX: Double-check environment (also checked in service layer)
        if (process.env.NODE_ENV === 'production') {
          logger.error({ userId: request.user.id }, 'Attempted to reset setup in production - BLOCKED');
          return reply.status(403).send({
            success: false,
            error: 'Setup reset is not allowed in production environment',
          });
        }

        logger.warn({ userId: request.user.id }, 'Resetting setup');

        await resetSetup();

        return reply.send({
          success: true,
          message: 'Setup reset successfully. All data has been cleared.',
        });
      } catch (error) {
        logger.error(error, 'Failed to reset setup');

        // Handle production environment error
        if (error instanceof Error && error.message.includes('production environment')) {
          return reply.status(403).send({
            success: false,
            error: error.message,
          });
        }

        return reply.status(500).send({
          success: false,
          error: 'Failed to reset setup',
        });
      }
    }
  );
}

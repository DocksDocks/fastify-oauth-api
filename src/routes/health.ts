import type { FastifyPluginAsync } from 'fastify';
import { successResponse } from '@/utils/response';

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async () => {
    return successResponse({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  });
};

export default healthRoutes;

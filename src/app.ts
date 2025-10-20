import Fastify, { type FastifyServerOptions, type FastifyInstance } from 'fastify';
import fastifySensible from '@fastify/sensible';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyCompress from '@fastify/compress';
import fastifyRateLimit from '@fastify/rate-limit';
import { env } from '@/config';
import { logger } from '@/utils/logger';
import { errorResponse } from '@/utils/response';
import { AppError } from '@/utils/errors';
import healthRoutes from '@/routes/health';

export async function buildApp(opts: FastifyServerOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: logger,
    ...opts,
  });

  // Register essential plugins
  await app.register(fastifySensible);

  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  });

  await app.register(fastifyCompress);

  await app.register(fastifyRateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX) || 100,
    timeWindow: Number(process.env.RATE_LIMIT_WINDOW) || 60000,
  });

  await app.register(fastifyCors, {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  // Error handler
  app.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode || 500;

    app.log.error({
      error: {
        message: error.message,
        stack: error.stack,
        statusCode,
      },
      request: {
        method: request.method,
        url: request.url,
        params: request.params,
        query: request.query,
      },
    });

    if (error instanceof AppError) {
      return reply.status(statusCode).send(errorResponse(error.code || 'ERROR', error.message));
    }

    // Don't leak error details in production
    const message =
      env.NODE_ENV === 'production' ? 'Internal server error' : error.message;

    return reply.status(statusCode).send(errorResponse('INTERNAL_ERROR', message));
  });

  // Register routes
  await app.register(healthRoutes);

  // Root route
  app.get('/', async () => {
    return {
      name: 'Fastify OAuth API',
      version: '1.0.0',
      environment: env.NODE_ENV,
      endpoints: {
        health: '/health',
        docs: '/documentation',
        api: '/api',
      },
    };
  });

  return app;
}

export default buildApp;

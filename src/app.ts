import Fastify, { type FastifyServerOptions, type FastifyInstance } from 'fastify';
import fastifySensible from '@fastify/sensible';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyCompress from '@fastify/compress';
import fastifyRateLimit from '@fastify/rate-limit';
import { env } from '@/config';
import { errorResponse } from '@/utils/response';
import { AppError } from '@/utils/errors';
import healthRoutes from '@/routes/health';
import jwtPlugin from '@/plugins/jwt';
import authRoutes from '@/modules/auth/auth.routes';
import profileRoutes from '@/routes/profile';
import adminUserRoutes from '@/routes/admin/users';
import { exercisesRoutes } from '@/modules/exercises/exercises.routes';
import { workoutsRoutes } from '@/modules/workouts/workouts.routes';

export async function buildApp(opts: FastifyServerOptions = {}): Promise<FastifyInstance> {
  const isProduction = env.NODE_ENV === 'production';
  const prettyPrint = env.LOG_PRETTY_PRINT === 'true';

  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport:
        !isProduction && prettyPrint
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
      redact: {
        paths: ['req.headers.authorization', 'password', 'token', 'accessToken', 'refreshToken'],
        remove: true,
      },
    },
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

  // Register JWT plugin for authentication
  await app.register(jwtPlugin);

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
    const message = env.NODE_ENV === 'production' ? 'Internal server error' : error.message;

    return reply.status(statusCode).send(errorResponse('INTERNAL_ERROR', message));
  });

  // Register routes
  await app.register(healthRoutes);

  // Authentication routes
  await app.register(authRoutes, { prefix: '/api/auth' });

  // User profile routes (protected)
  await app.register(profileRoutes, { prefix: '/api/profile' });

  // Exercise routes (optional auth, RBAC)
  await app.register(exercisesRoutes, { prefix: '/api/exercises' });

  // Workout routes (protected, RBAC, sharing)
  await app.register(workoutsRoutes, { prefix: '/api/workouts' });

  // Admin routes (admin only)
  await app.register(adminUserRoutes, { prefix: '/api/admin/users' });

  // Root route
  app.get('/', async () => {
    return {
      name: 'Fastify OAuth API - Gym Workout Tracker',
      version: '1.0.0',
      environment: env.NODE_ENV,
      endpoints: {
        health: '/health',
        docs: '/documentation',
        api: '/api',
        auth: {
          google: '/api/auth/google',
          apple: '/api/auth/apple',
          refresh: '/api/auth/refresh',
          verify: '/api/auth/verify',
          logout: '/api/auth/logout',
        },
        profile: '/api/profile',
        exercises: '/api/exercises',
        workouts: '/api/workouts',
        admin: '/api/admin/users',
      },
    };
  });

  return app;
}

export default buildApp;

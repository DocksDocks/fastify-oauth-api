import Fastify, {
  type FastifyServerOptions,
  type FastifyInstance,
  type FastifyRequest,
} from 'fastify';
import fastifySensible from '@fastify/sensible';
import fastifyFormBody from '@fastify/formbody';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyCompress from '@fastify/compress';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '@/config';
import { errorResponse } from '@/utils/response';
import { AppError } from '@/utils/errors';
import healthRoutes from '@/routes/health';
import jwtPlugin from '@/plugins/jwt';
import authRoutes from '@/modules/auth/auth.routes';
import setupRoutes from '@/routes/setup';
import profileRoutes from '@/routes/profile';
import adminUserRoutes from '@/routes/admin/users';
import adminApiKeysRoutes from '@/routes/admin/api-keys';
import adminCollectionsRoutes from '@/routes/admin/collections';
import { authorizedAdminsRoutes } from '@/routes/admin/authorized-admins';
import ingresseRoutes from '@/ingresse/routes/ingresse.routes';
import eventsRoutes from '@/ingresse/routes/events.routes';
import walletRoutes from '@/ingresse/routes/wallet.routes';
import { validateApiKey } from '@/middleware/api-key';
import { decodeRequestToken, hasAnyRole } from '@/utils/jwt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function buildApp(opts: FastifyServerOptions = {}): Promise<FastifyInstance> {
  const isProduction = env.NODE_ENV === 'production';
  const isDevelopment = env.NODE_ENV === 'development';
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
          /* v8 ignore next */
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

  // Register form body parser for OAuth callbacks (Apple sends form-encoded data)
  await app.register(fastifyFormBody);

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

  // Conditional compression: ngrok corrupts gzip responses in development
  // Only enable compression in production where ngrok isn't used
  if (isProduction) {
    await app.register(fastifyCompress)
  }

  await app.register(fastifyRateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX) || 500,
    timeWindow: Number(process.env.RATE_LIMIT_WINDOW) || 60000,
    allowList: (request: FastifyRequest) => {
      // Allow (skip rate limiting) for admin and superadmin users only
      const decoded = decodeRequestToken(app, request);
      return hasAnyRole(decoded, ['admin', 'superadmin']);
    },
  });

  await app.register(fastifyCors, {
    origin: isProduction
      ? [env.API_URL, env.ADMIN_PANEL_URL, process.env.CORS_ORIGIN].filter(
          (origin): origin is string => Boolean(origin),
        )
      : [
          'http://localhost:5173', // Vite dev server
          'http://127.0.0.1:5173',
          'http://localhost:3000', // Admin panel dev
          'http://127.0.0.1:3000',
          env.API_URL,
          env.ADMIN_PANEL_URL,
          process.env.CORS_ORIGIN,
        ].filter((origin): origin is string => Boolean(origin)),
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Register JWT plugin for authentication
  await app.register(jwtPlugin);

  // Register API key validation middleware (runs on all routes except whitelisted)
  app.addHook('onRequest', validateApiKey);

  // Error handler
  app.setErrorHandler((error, request, reply) => {
    const err = error as Error & { statusCode?: number };
    const statusCode = err.statusCode || 500;

    app.log.error({
      error: {
        message: err.message,
        stack: err.stack,
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
    const message = env.NODE_ENV === 'production' ? 'Internal server error' : err.message;

    return reply.status(statusCode).send(errorResponse('INTERNAL_ERROR', message));
  });

  // Register routes
  await app.register(healthRoutes);

  // Setup routes (no auth required for status check)
  await app.register(setupRoutes);

  // Authentication routes
  await app.register(authRoutes, { prefix: '/api/auth' });

  // User profile routes (protected)
  await app.register(profileRoutes, { prefix: '/api/profile' });

  // Ingresse ticketing routes (protected, all authenticated users)
  await app.register(ingresseRoutes, { prefix: '/api/tickets' });

  // Ingresse events routes (public - API key only)
  await app.register(eventsRoutes, { prefix: '/api/tickets/events' });

  // Ingresse wallet routes (protected - JWT + Ingresse account required)
  await app.register(walletRoutes, { prefix: '/api/tickets/wallet' });

  // Admin routes (admin only)
  await app.register(adminUserRoutes, { prefix: '/api/admin/users' });
  await app.register(adminApiKeysRoutes, { prefix: '/api/admin/api-keys' });
  await app.register(adminCollectionsRoutes, { prefix: '/api/admin/collections' });
  await app.register(authorizedAdminsRoutes, { prefix: '/api/admin/authorized-admins' });

  // Collection Builder (development and test only)
  if (isDevelopment || env.NODE_ENV === 'test') {
    const { collectionBuilderRoutes } = await import('@/builder/routes/collection-builder');
    await app.register(collectionBuilderRoutes, { prefix: '/api/admin/collection-builder' });
    app.log.info(`Collection Builder routes registered (${env.NODE_ENV} mode)`);
  }

  // Serve admin panel static files (production only)
  if (isProduction) {
    const adminDistPath = path.join(__dirname, '../dist/admin');

    await app.register(fastifyStatic, {
      root: adminDistPath,
      prefix: '/admin/',
      decorateReply: false, // Don't add reply.sendFile (we use custom handler)
    });

    // SPA fallback for admin panel (handles client-side routing)
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/admin')) {
        return reply.sendFile('index.html', adminDistPath);
      }
      // For API routes, return 404 JSON
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Route not found',
        },
      });
    });
  }

  // Root route
  app.get('/', async () => {
    const adminEndpoints: Record<string, string> = {
      users: '/api/admin/users',
      apiKeys: '/api/admin/api-keys',
      collections: '/api/admin/collections',
      authorizedAdmins: '/api/admin/authorized-admins',
      panel: isProduction ? '/admin' : 'http://localhost:5173',
    };

    // Only show collection builder in development and test
    if (isDevelopment || env.NODE_ENV === 'test') {
      adminEndpoints.collectionBuilder = '/api/admin/collection-builder';
    }

    return {
      name: 'Fastify OAuth API + Admin Panel',
      version: '2.0.0',
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
        tickets: {
          login: '/api/tickets/login',
          mfaVerify: '/api/tickets/mfa/verify',
          link: '/api/tickets/link',
          profile: '/api/tickets/profile',
          unlink: '/api/tickets/unlink',
          sync: '/api/tickets/sync',
        },
        admin: adminEndpoints,
      },
    };
  });

  return app;
}

export default buildApp;

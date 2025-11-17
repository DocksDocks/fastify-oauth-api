import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  HOST: z.string().default('0.0.0.0'),

  // Application URLs
  API_URL: z.string().default('http://localhost:1337'),
  ADMIN_PANEL_URL: z.string().default('http://localhost:3000'),

  DATABASE_HOST: z.string(),
  DATABASE_PORT: z.string(),
  DATABASE_USER: z.string(),
  DATABASE_PASSWORD: z.string(),
  DATABASE_NAME: z.string(),
  DATABASE_POOL_MIN: z.coerce.number().default(2),
  DATABASE_POOL_MAX: z.coerce.number().default(10),

  REDIS_HOST: z.string(),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),
  REDIS_KEY_PREFIX: z.string().default('fastify:'),

  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),

  // Google OAuth - Admin Panel (Web Application)
  GOOGLE_CLIENT_ID_ADMIN: z.string(),
  GOOGLE_CLIENT_SECRET_ADMIN: z.string(),
  GOOGLE_REDIRECT_URI_ADMIN: z.string(),

  // Google OAuth - Mobile Apps (iOS/Android)
  GOOGLE_CLIENT_ID_IOS: z.string().optional(),
  GOOGLE_REDIRECT_URI_IOS: z.string().optional(), // iOS URL scheme
  GOOGLE_CLIENT_ID_ANDROID: z.string().optional(),
  GOOGLE_REDIRECT_URI_ANDROID: z.string().optional(), // Android URL scheme

  GOOGLE_SCOPES: z.string().default('openid email profile'),

  // Apple OAuth
  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_TEAM_ID: z.string().optional(),
  APPLE_KEY_ID: z.string().optional(),
  APPLE_PRIVATE_KEY_PATH: z.string().optional(),
  APPLE_REDIRECT_URI_ADMIN: z.string().optional(), // Admin panel OAuth
  APPLE_REDIRECT_URI_MOBILE: z.string().optional(), // Mobile app OAuth
  APPLE_SCOPES: z.string().default('name email'),

  // Ingresse API Configuration
  INGRESSE_API_PROXY_URL: z.string().url().default('https://api-proxy.backstagemirante.com'),
  INGRESSE_API_TIMEOUT: z.coerce.number().default(30000),

  // Encryption (AES-256-CBC)
  ENCRYPTION_KEY: z.string().min(32, 'Encryption key must be at least 32 characters'),
  ENCRYPTION_IV_LENGTH: z.coerce.number().default(16),

  LOG_LEVEL: z.string().default('info'),
  LOG_PRETTY_PRINT: z.string().default('false'),
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);

export default env;

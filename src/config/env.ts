import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  HOST: z.string().default('0.0.0.0'),

  DATABASE_HOST: z.string(),
  DATABASE_PORT: z.string(),
  DATABASE_USER: z.string(),
  DATABASE_PASSWORD: z.string(),
  DATABASE_NAME: z.string(),
  DATABASE_POOL_MIN: z.coerce.number().default(2),
  DATABASE_POOL_MAX: z.coerce.number().default(10),

  REDIS_HOST: z.string(),
  REDIS_PORT: z.string(),

  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),

  ADMIN_EMAIL: z.string().email(),
  ADMIN_EMAILS_ADDITIONAL: z.string().optional().default(''),
  SUPER_ADMIN_EMAIL: z.string().email().optional(),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
  GOOGLE_REDIRECT_URI_MOBILE: z.string().optional(),
  GOOGLE_SCOPES: z.string().default('openid email profile'),

  // Apple OAuth
  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_TEAM_ID: z.string().optional(),
  APPLE_KEY_ID: z.string().optional(),
  APPLE_PRIVATE_KEY_PATH: z.string().optional(),
  APPLE_REDIRECT_URI: z.string().optional(),
  APPLE_REDIRECT_URI_MOBILE: z.string().optional(),
  APPLE_SCOPES: z.string().default('name email'),

  LOG_LEVEL: z.string().default('info'),
  LOG_PRETTY_PRINT: z.string().default('false'),
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);

export default env;

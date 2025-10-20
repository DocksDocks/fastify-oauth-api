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

  REDIS_HOST: z.string(),
  REDIS_PORT: z.string(),

  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),

  ADMIN_EMAIL: z.string().email(),
  ADMIN_EMAILS_ADDITIONAL: z.string().optional().default(''),

  LOG_LEVEL: z.string().default('info'),
  LOG_PRETTY_PRINT: z.string().default('false'),
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);

export default env;

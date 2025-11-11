import { buildApp } from '@/app';
import type { FastifyInstance } from 'fastify';

/**
 * Build a test Fastify app instance with all plugins and routes
 * Uses test database via mocked db client from setup.ts
 */
export async function buildTestApp(): Promise<FastifyInstance> {
  const app = await buildApp({ logger: false });
  return app;
}

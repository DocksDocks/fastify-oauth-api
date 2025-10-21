import type { FastifyInstance } from 'fastify';
import { testDb } from './test-db';
import { generateTestToken } from './factories';

/**
 * Make authenticated request helper
 */
export async function makeAuthenticatedRequest(
  app: FastifyInstance,
  options: {
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
    url: string;
    user: { id: number; email: string; role: 'user' | 'coach' | 'admin' | 'superadmin' };
    payload?: any;
    headers?: Record<string, string>;
  }
) {
  const { accessToken } = await generateTestToken(options.user);

  return app.inject({
    method: options.method,
    url: options.url,
    headers: {
      authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
    payload: options.payload,
  });
}

/**
 * Get table row count
 */
export async function getTableCount(tableName: string): Promise<number> {
  const result = await testDb.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
  return Number(result[0].count);
}

/**
 * Check if record exists
 */
export async function recordExists(
  tableName: string,
  field: string,
  value: any
): Promise<boolean> {
  const result = await testDb.execute(
    `SELECT COUNT(*) as count FROM ${tableName} WHERE ${field} = $1`,
    [value]
  );
  return Number(result[0].count) > 0;
}

/**
 * Wait for a condition to be true (useful for async operations)
 */
export async function waitFor(
  condition: () => Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('Timeout waiting for condition');
}

/**
 * Parse JSON response safely
 */
export function parseJsonResponse<T = any>(response: string): T {
  try {
    return JSON.parse(response);
  } catch (error) {
    throw new Error(`Failed to parse JSON response: ${response}`);
  }
}

/**
 * Assert response success
 */
export function assertSuccessResponse(response: any): void {
  if (!response.success) {
    throw new Error(`Expected success response, got: ${JSON.stringify(response)}`);
  }
}

/**
 * Assert response error
 */
export function assertErrorResponse(response: any, expectedStatus?: number): void {
  if (response.success !== false) {
    throw new Error(`Expected error response, got: ${JSON.stringify(response)}`);
  }
  if (expectedStatus && response.statusCode !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus}, got ${response.statusCode}: ${JSON.stringify(response)}`
    );
  }
}

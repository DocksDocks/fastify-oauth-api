import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { sql } from 'drizzle-orm';
import { testDb } from './test-db';
import { generateTestToken } from './factories';

/**
 * Validate identifier name (table or column) to prevent SQL injection
 * @param name - The identifier name to validate
 * @throws Error if name is invalid
 */
function validateIdentifierName(name: string): void {
  // PostgreSQL identifier rules: must start with letter or underscore,
  // followed by letters, digits, underscores, or dollar signs
  // We're more restrictive: lowercase letters, digits, and underscores only
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) {
    throw new Error(`Invalid identifier name: "${name}". Must match pattern: ^[a-z_][a-z0-9_]*$`);
  }

  // Additional length check (PostgreSQL limit is 63 characters)
  if (name.length > 63) {
    throw new Error(`Identifier name too long: "${name}". Maximum length is 63 characters`);
  }
}

/**
 * Make authenticated request helper
 */
export async function makeAuthenticatedRequest(
  app: FastifyInstance,
  options: {
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
    url: string;
    user: { id: number; email: string; role: 'user' | 'coach' | 'admin' | 'superadmin' };
    payload?: unknown;
    headers?: Record<string, string>;
  }
): Promise<LightMyRequestResponse> {
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
 * @param tableName - The table name (validated for SQL injection prevention)
 * @returns The number of rows in the table
 */
export async function getTableCount(tableName: string): Promise<number> {
  // Validate table name to prevent SQL injection
  validateIdentifierName(tableName);

  // Use sql.identifier() for safe identifier escaping
  const result = await testDb.execute(
    sql`SELECT COUNT(*) as count FROM ${sql.identifier(tableName)}`
  );

  return Number(result[0].count);
}

/**
 * Check if record exists
 * @param tableName - The table name (validated for SQL injection prevention)
 * @param field - The field name to check (validated for SQL injection prevention)
 * @param value - The value to search for (safely parameterized)
 * @returns True if at least one record exists, false otherwise
 */
export async function recordExists(
  tableName: string,
  field: string,
  value: unknown
): Promise<boolean> {
  // Validate table and field names to prevent SQL injection
  validateIdentifierName(tableName);
  validateIdentifierName(field);

  // Use sql.identifier() for safe identifier escaping and parameterized value
  const result = await testDb.execute(
    sql`SELECT COUNT(*) as count FROM ${sql.identifier(tableName)} WHERE ${sql.identifier(field)} = ${value}`
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
export function parseJsonResponse<T = unknown>(response: string): T {
  try {
    return JSON.parse(response);
  } catch {
    throw new Error(`Failed to parse JSON response: ${response}`);
  }
}

/**
 * Assert response success
 */
export function assertSuccessResponse(response: unknown): void {
  const res = response as { success?: boolean };
  if (!res.success) {
    throw new Error(`Expected success response, got: ${JSON.stringify(response)}`);
  }
}

/**
 * Assert response error
 */
export function assertErrorResponse(response: unknown, expectedStatus?: number): void {
  const res = response as { success?: boolean; statusCode?: number };
  if (res.success !== false) {
    throw new Error(`Expected error response, got: ${JSON.stringify(response)}`);
  }
  if (expectedStatus && res.statusCode !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus}, got ${res.statusCode}: ${JSON.stringify(response)}`
    );
  }
}

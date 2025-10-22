/**
 * Collections Management Routes
 *
 * Read-only access to database tables via admin panel
 * Tables must be manually configured in src/config/collections.ts
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { sql, type SQL } from 'drizzle-orm';
import { db } from '@/db/client';
import { requireAdmin } from '@/middleware/authorize';
import {
  collections,
  getCollectionByTable,
  getAvailableCollections,
  type Collection,
} from '@/config/collections';
import { users } from '@/db/schema/users';
import { exercises } from '@/db/schema/exercises';
import { workouts } from '@/db/schema/workouts';
import { apiKeys } from '@/db/schema/api-keys';
import { refreshTokens } from '@/db/schema/refresh-tokens';
import type { PgTable } from 'drizzle-orm/pg-core';

// Table map for dynamic access
const tableMap: Record<string, PgTable> = {
  users,
  exercises,
  workouts,
  api_keys: apiKeys,
  refresh_tokens: refreshTokens,
};

/**
 * List all available collections
 * GET /api/admin/collections
 */
async function listCollections(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const availableCollections = getAvailableCollections();

    return reply.send({
      success: true,
      data: {
        collections: availableCollections,
        total: availableCollections.length,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to list collections');
    return reply.status(500).send({
      success: false,
      error: 'Failed to list collections',
    });
  }
}

/**
 * Get collection metadata (columns, configuration)
 * GET /api/admin/collections/:table/meta
 */
async function getCollectionMeta(
  request: FastifyRequest<{
    Params: { table: string };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { table } = request.params;

    const collection = getCollectionByTable(table);

    if (!collection) {
      return reply.status(404).send({
        success: false,
        error: `Collection '${table}' not found or not accessible`,
      });
    }

    return reply.send({
      success: true,
      data: collection,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get collection metadata');
    return reply.status(500).send({
      success: false,
      error: 'Failed to get collection metadata',
    });
  }
}

/**
 * Build WHERE clause for search
 */
function buildSearchClause(collection: Collection, search?: string): sql.SQL | undefined {
  if (!search || search.trim() === '') {
    return undefined;
  }

  const searchableColumns = collection.columns
    .filter((col) => col.searchable)
    .map((col) => col.name);

  if (searchableColumns.length === 0) {
    return undefined;
  }

  // Build ILIKE conditions for each searchable column
  const searchPattern = `%${search}%`;
  const conditions = searchableColumns.map((col) => {
    return sql`${sql.identifier(col)}::text ILIKE ${searchPattern}`;
  });

  // Combine with OR
  return conditions.reduce((acc, condition) => {
    return acc ? sql`${acc} OR ${condition}` : condition;
  });
}

/**
 * Build ORDER BY clause
 */
function buildOrderClause(
  collection: Collection,
  sortBy?: string,
  sortOrder?: 'asc' | 'desc',
): sql.SQL {
  // Use provided sort or default
  const column = sortBy || collection.defaultSort?.column || 'id';
  const order = sortOrder || collection.defaultSort?.order || 'desc';

  // Validate column is sortable
  const columnConfig = collection.columns.find((c) => c.name === column);
  if (!columnConfig || !columnConfig.sortable) {
    // Fall back to default
    const defaultColumn = collection.defaultSort?.column || 'id';
    const defaultOrder = collection.defaultSort?.order || 'desc';
    return defaultOrder === 'asc'
      ? sql`${sql.identifier(defaultColumn)} ASC`
      : sql`${sql.identifier(defaultColumn)} DESC`;
  }

  return order === 'asc' ? sql`${sql.identifier(column)} ASC` : sql`${sql.identifier(column)} DESC`;
}

/**
 * Query collection data
 * GET /api/admin/collections/:table/data
 */
async function getCollectionData(
  request: FastifyRequest<{
    Params: { table: string };
    Querystring: {
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { table } = request.params;
    const {
      page = 1,
      limit: requestedLimit,
      search,
      sortBy,
      sortOrder,
    } = request.query;

    const collection = getCollectionByTable(table);

    if (!collection) {
      return reply.status(404).send({
        success: false,
        error: `Collection '${table}' not found or not accessible`,
      });
    }

    // Get table schema from map
    const tableSchema = tableMap[table];
    if (!tableSchema) {
      return reply.status(500).send({
        success: false,
        error: `Table '${table}' not found in schema map`,
      });
    }

    // Use default limit from collection or 20
    const limit = requestedLimit || collection.defaultLimit || 20;
    const offset = (page - 1) * limit;

    // Build query
    let query = db.select().from(tableSchema);

    // Add search filter
    const searchClause = buildSearchClause(collection, search);
    if (searchClause) {
      query = query.where(searchClause);
    }

    // Add sorting
    const orderClause = buildOrderClause(collection, sortBy, sortOrder);
    query = query.orderBy(orderClause);

    // Add pagination
    query = query.limit(limit).offset(offset);

    // Execute query
    const data = await query;

    // Get total count
    let countQuery = db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(tableSchema);

    if (searchClause) {
      countQuery = countQuery.where(searchClause);
    }

    const countResult = await countQuery;
    const total = countResult[0]?.count || 0;
    const totalPages = Math.max(1, Math.ceil(total / limit)); // At least 1 page

    // Always return success with empty array if no data
    return reply.send({
      success: true,
      data: {
        collection: collection.name,
        table: collection.table,
        rows: data || [], // Ensure array
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    // Log detailed error information
    request.log.error(
      {
        error,
        table: request.params.table,
        query: request.query,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
      },
      'Failed to query collection data'
    );
    return reply.status(500).send({
      success: false,
      error: 'Failed to query collection data',
    });
  }
}

/**
 * Get single record from collection
 * GET /api/admin/collections/:table/data/:id
 */
async function getCollectionRecord(
  request: FastifyRequest<{
    Params: { table: string; id: number };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { table, id } = request.params;

    const collection = getCollectionByTable(table);

    if (!collection) {
      return reply.status(404).send({
        success: false,
        error: `Collection '${table}' not found or not accessible`,
      });
    }

    // Get table schema from map
    const tableSchema = tableMap[table];
    if (!tableSchema) {
      return reply.status(500).send({
        success: false,
        error: `Table '${table}' not found in schema map`,
      });
    }

    // Query single record by ID
    const data = await db
      .select()
      .from(tableSchema)
      .where(sql`id = ${id}`)
      .limit(1);

    if (data.length === 0) {
      return reply.status(404).send({
        success: false,
        error: 'Record not found',
      });
    }

    return reply.send({
      success: true,
      data: {
        collection: collection.name,
        table: collection.table,
        record: data[0],
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get collection record');
    return reply.status(500).send({
      success: false,
      error: 'Failed to get collection record',
    });
  }
}

/**
 * Register collections management routes
 */
export default async function collectionsRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require authentication + admin role
  fastify.addHook('onRequest', fastify.authenticate);
  fastify.addHook('onRequest', requireAdmin);

  // List all available collections
  fastify.get('/', {
    schema: {
      description: 'List all available collections',
      tags: ['admin', 'collections'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                collections: { type: 'array' },
                total: { type: 'number' },
              },
            },
          },
        },
      },
    },
    handler: listCollections,
  });

  // Get collection metadata
  fastify.get('/:table/meta', {
    schema: {
      description: 'Get collection metadata and configuration',
      tags: ['admin', 'collections'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['table'],
        properties: {
          table: { type: 'string' },
        },
      },
    },
    handler: getCollectionMeta,
  });

  // Query collection data with pagination/search/sort
  fastify.get('/:table/data', {
    schema: {
      description: 'Query collection data (read-only)',
      tags: ['admin', 'collections'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['table'],
        properties: {
          table: { type: 'string' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1, default: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          search: { type: 'string' },
          sortBy: { type: 'string' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'] },
        },
      },
    },
    handler: getCollectionData,
  });

  // Get single record by ID
  fastify.get('/:table/data/:id', {
    schema: {
      description: 'Get single record from collection',
      tags: ['admin', 'collections'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['table', 'id'],
        properties: {
          table: { type: 'string' },
          id: { type: 'number' },
        },
      },
    },
    handler: getCollectionRecord,
  });
}

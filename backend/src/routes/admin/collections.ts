/**
 * Collections Management Routes
 *
 * Read-only access to database tables via admin panel
 * Tables are auto-generated from Drizzle schema files
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { sql, type SQL } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { db } from '@/db/client';
import { requireAdmin } from '@/middleware/authorize';
import {
  getCollectionByTableAsync,
  getAvailableCollectionsAsync,
  getTableMap,
  type Collection,
} from '@/config/collections';
import { collectionPreferences } from '@/db/schema';

/**
 * Check if user has required role for collection access
 */
function hasRequiredRole(userRole: string, requiredRole?: 'admin' | 'superadmin'): boolean {
  if (!requiredRole) return true; // No role requirement
  if (requiredRole === 'admin') return userRole === 'admin' || userRole === 'superadmin';
  if (requiredRole === 'superadmin') return userRole === 'superadmin';
  return false;
}

/**
 * Validate table name format to prevent SQL injection (defense-in-depth)
 * This adds an extra layer of security on top of the whitelist validation
 * @throws Error if table name format is invalid
 */
function validateTableNameFormat(tableName: string): void {
  // PostgreSQL identifier rules: lowercase letters, digits, and underscores only
  // Must start with a letter or underscore
  if (!/^[a-z_][a-z0-9_]*$/.test(tableName)) {
    throw new Error(`Invalid table name format: "${tableName}"`);
  }

  // PostgreSQL identifier length limit
  if (tableName.length > 63) {
    throw new Error(`Table name exceeds maximum length of 63 characters: "${tableName}"`);
  }
}

/**
 * List all available collections
 * GET /api/admin/collections
 */
async function listCollections(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const userRole = request.user?.role || 'user';
    const availableCollections = await getAvailableCollectionsAsync();

    // Filter collections based on user role
    const accessibleCollections = availableCollections.filter((collection) =>
      hasRequiredRole(userRole, collection.requiredRole)
    );

    return reply.send({
      success: true,
      collections: accessibleCollections,
      total: accessibleCollections.length,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to list collections');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to list collections',
      },
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
    const userRole = request.user?.role || 'user';

    const collection = await getCollectionByTableAsync(table);

    if (!collection) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'COLLECTION_NOT_FOUND',
          message: `Collection '${table}' not found or not accessible`,
        },
      });
    }

    // Check if user has required role to access this collection
    if (!hasRequiredRole(userRole, collection.requiredRole)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Access denied. ${collection.requiredRole} role required for this collection.`,
        },
      });
    }

    return reply.send({
      success: true,
      collection,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get collection metadata');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get collection metadata',
      },
    });
  }
}

/**
 * Build WHERE clause for search
 */
function buildSearchClause(collection: Collection, search?: string): SQL | undefined {
  if (!search || search.trim() === '') {
    return undefined;
  }

  const searchableColumns = collection.columns
    .filter((col) => col.searchable)
    .map((col) => col.dbColumnName); // Use database column name for SQL

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
): SQL {
  // Use provided sort or default
  const column = sortBy || collection.defaultSort?.column || 'id';
  const order = sortOrder || collection.defaultSort?.order || 'desc';

  // Validate column is sortable and get database column name
  const columnConfig = collection.columns.find((c) => c.name === column);
  if (!columnConfig || !columnConfig.sortable) {
    // Fall back to default
    const defaultColumn = collection.defaultSort?.column || 'id';
    const defaultColumnConfig = collection.columns.find((c) => c.name === defaultColumn);
    const defaultDbColumn = defaultColumnConfig?.dbColumnName || defaultColumn;
    const defaultOrder = collection.defaultSort?.order || 'desc';
    return defaultOrder === 'asc'
      ? sql`${sql.identifier(defaultDbColumn)} ASC`
      : sql`${sql.identifier(defaultDbColumn)} DESC`;
  }

  // Use database column name for SQL query
  return order === 'asc'
    ? sql`${sql.identifier(columnConfig.dbColumnName)} ASC`
    : sql`${sql.identifier(columnConfig.dbColumnName)} DESC`;
}

/**
 * Enrich rows with foreign key data
 * Adds _fk_<columnName> fields with related record data
 */
async function enrichRowsWithForeignKeys(
  rows: Record<string, unknown>[],
  collection: Collection,
  tableMap: Record<string, unknown>,
): Promise<Record<string, unknown>[]> {
  if (rows.length === 0) return rows;

  // Find columns with foreign keys
  const fkColumns = collection.columns.filter((col) => col.foreignKey);
  if (fkColumns.length === 0) return rows;

  // Enrich each row
  const enrichedRows = await Promise.all(
    rows.map(async (row) => {
      const enrichedRow = { ...row };

      for (const fkColumn of fkColumns) {
        const fkValue = row[fkColumn.name];
        if (fkValue && fkColumn.foreignKey) {
          try {
            // Get the related table schema
            const relatedTable = tableMap[fkColumn.foreignKey.table];
            if (relatedTable) {
              // Fetch the related record
              const relatedRecords = await db
                .select()
                .from(relatedTable as PgTable)
                .where(sql`id = ${fkValue}`)
                .limit(1);

              if (relatedRecords.length > 0) {
                const relatedRecord = relatedRecords[0] as Record<string, unknown>;
                // Add foreign key data with _fk_ prefix
                enrichedRow[`_fk_${fkColumn.name}`] = {
                  id: fkValue,
                  displayValue: relatedRecord[fkColumn.foreignKey.displayField] || fkValue,
                  labelValue: fkColumn.foreignKey.labelField
                    ? relatedRecord[fkColumn.foreignKey.labelField]
                    : null,
                  table: fkColumn.foreignKey.table,
                  record: relatedRecord, // Include full related record
                };
              }
            }
          } catch (error) {
            // If foreign key fetch fails, just skip it
            console.error(`Failed to fetch foreign key for ${fkColumn.name}:`, error);
          }
        }
      }

      return enrichedRow;
    })
  );

  return enrichedRows;
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
    const userRole = request.user?.role || 'user';
    const {
      page = 1,
      limit: requestedLimit,
      search,
      sortBy,
      sortOrder,
    } = request.query;

    const collection = await getCollectionByTableAsync(table);

    if (!collection) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'COLLECTION_NOT_FOUND',
          message: `Collection '${table}' not found or not accessible`,
        },
      });
    }

    // Check if user has required role to access this collection
    if (!hasRequiredRole(userRole, collection.requiredRole)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Access denied. ${collection.requiredRole} role required for this collection.`,
        },
      });
    }

    // Get table schema from map
    const tableMap = getTableMap();
    const tableSchema = tableMap[table];
    if (!tableSchema) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'TABLE_SCHEMA_NOT_FOUND',
          message: `Table '${table}' not found in schema map`,
        },
      });
    }

    // Use default limit from collection or 20
    const limit = requestedLimit || collection.defaultLimit || 20;
    const offset = (page - 1) * limit;

    // Build query - let TypeScript infer types
    const baseQuery = db.select().from(tableSchema);

    // Add search filter
    const searchClause = buildSearchClause(collection, search);
    const queryWithSearch = searchClause ? baseQuery.where(searchClause) : baseQuery;

    // Add sorting
    const orderClause = buildOrderClause(collection, sortBy, sortOrder);
    const queryWithOrder = queryWithSearch.orderBy(orderClause);

    // Add pagination
    const queryWithPagination = queryWithOrder.limit(limit).offset(offset);

    // Execute query
    const data = await queryWithPagination;

    // Enrich rows with foreign key data
    const enrichedData = await enrichRowsWithForeignKeys(data, collection, tableMap);

    // Get total count
    const baseCountQuery = db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(tableSchema);

    const countQuery = searchClause ? baseCountQuery.where(searchClause) : baseCountQuery;

    const countResult = await countQuery;
    const total = countResult[0]?.count || 0;
    const totalPages = Math.max(1, Math.ceil(total / limit)); // At least 1 page

    // Always return success with empty array if no data
    return reply.send({
      success: true,
      collection: collection.name,
      table: collection.table,
      rows: enrichedData || [], // Ensure array
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
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
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to query collection data',
      },
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
    const userRole = request.user?.role || 'user';

    const collection = await getCollectionByTableAsync(table);

    if (!collection) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'COLLECTION_NOT_FOUND',
          message: `Collection '${table}' not found or not accessible`,
        },
      });
    }

    // Check if user has required role to access this collection
    if (!hasRequiredRole(userRole, collection.requiredRole)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Access denied. ${collection.requiredRole} role required for this collection.`,
        },
      });
    }

    // Get table schema from map
    const tableMap = getTableMap();
    const tableSchema = tableMap[table];
    if (!tableSchema) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'TABLE_SCHEMA_NOT_FOUND',
          message: `Table '${table}' not found in schema map`,
        },
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
        error: {
          code: 'RECORD_NOT_FOUND',
          message: 'Record not found',
        },
      });
    }

    return reply.send({
      success: true,
      collection: collection.name,
      table: collection.table,
      record: data[0],
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get collection record');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get collection record',
      },
    });
  }
}

/**
 * Update a record in collection
 * PATCH /api/admin/collections/:table/data/:id
 */
async function updateCollectionRecord(
  request: FastifyRequest<{
    Params: { table: string; id: number };
    Body: Record<string, unknown>;
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { table, id } = request.params;
    const userRole = request.user?.role || 'user';
    const updates = request.body;

    // Defense-in-depth: Validate table name format before whitelist check
    try {
      validateTableNameFormat(table);
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_TABLE_NAME',
          message: error instanceof Error ? error.message : 'Invalid table name format',
        },
      });
    }

    const collection = await getCollectionByTableAsync(table);

    if (!collection) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'COLLECTION_NOT_FOUND',
          message: `Collection '${table}' not found or not accessible`,
        },
      });
    }

    // Check if user has required role to access this collection
    if (!hasRequiredRole(userRole, collection.requiredRole)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Access denied. ${collection.requiredRole} role required for this collection.`,
        },
      });
    }

    // Get table schema from map
    const tableMap = getTableMap();
    const tableSchema = tableMap[table];
    if (!tableSchema) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'TABLE_SCHEMA_NOT_FOUND',
          message: `Table '${table}' not found in schema map`,
        },
      });
    }

    // RBAC: Check if user is trying to modify a superadmin record in users table
    if (table === 'users' && userRole !== 'superadmin') {
      // Fetch the existing record to check its role
      const existingRecord = await db
        .select()
        .from(tableSchema)
        .where(sql`id = ${id}`)
        .limit(1);

      if (existingRecord.length > 0) {
        const recordRole = (existingRecord[0] as { role?: string }).role;
        if (recordRole === 'superadmin') {
          return reply.status(403).send({
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'Only superadmins can modify superadmin users.',
            },
          });
        }
      }
    }

    // Filter out protected fields (id, timestamps)
    const baseProtectedFields = ['id', 'createdAt', 'updatedAt', 'created_at', 'updated_at', 'last_login_at', 'lastLoginAt'];

    // Additional readonly fields for users table (authentication-related fields)
    const usersReadonlyFields = ['email', 'primaryProviderAccountId', 'primary_provider_account_id'];

    const protectedFields = table === 'users'
      ? [...baseProtectedFields, ...usersReadonlyFields]
      : baseProtectedFields;

    const filteredUpdates: Record<string, unknown> = {};
    const attemptedProtectedFields: string[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (protectedFields.includes(key)) {
        attemptedProtectedFields.push(key);
      } else {
        filteredUpdates[key] = value;
      }
    }

    // Inform user if they tried to update protected fields
    if (attemptedProtectedFields.length > 0) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'READONLY_FIELDS',
          message: `Cannot update readonly fields: ${attemptedProtectedFields.join(', ')}`,
        },
      });
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'NO_VALID_FIELDS',
          message: 'No valid fields to update',
        },
      });
    }

    // RBAC: Prevent non-superadmin from setting role to superadmin in users table
    if (table === 'users' && 'role' in filteredUpdates) {
      const newRole = filteredUpdates.role as string;
      if (newRole === 'superadmin' && userRole !== 'superadmin') {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only superadmins can assign the superadmin role.',
          },
        });
      }
    }

    // Note: updated_at is automatically updated by the database trigger/default

    // Build UPDATE query using raw SQL for dynamic fields
    const setClauses = Object.entries(filteredUpdates)
      .map(([key, value]) => {
        // Find the database column name from collection config
        const column = collection.columns.find((c) => c.name === key);
        const dbColumnName = column?.dbColumnName || key;
        return sql`${sql.identifier(dbColumnName)} = ${value}`;
      });

    const setClause = setClauses.reduce((acc, clause) => {
      return acc ? sql`${acc}, ${clause}` : clause;
    });

    // Execute UPDATE query
    await db.execute(
      sql`UPDATE ${sql.identifier(table)} SET ${setClause} WHERE id = ${id}`
    );

    // Fetch updated record
    const updatedData = await db
      .select()
      .from(tableSchema)
      .where(sql`id = ${id}`)
      .limit(1);

    if (updatedData.length === 0) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'RECORD_NOT_FOUND',
          message: 'Record not found after update',
        },
      });
    }

    return reply.send({
      success: true,
      collection: collection.name,
      table: collection.table,
      record: updatedData[0],
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to update collection record');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'UPDATE_FAILED',
        message: 'Failed to update collection record',
      },
    });
  }
}

/**
 * Delete a record from collection
 * DELETE /api/admin/collections/:table/data/:id
 */
async function deleteCollectionRecord(
  request: FastifyRequest<{
    Params: { table: string; id: number };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { table, id } = request.params;
    const userRole = request.user?.role || 'user';

    // Defense-in-depth: Validate table name format before whitelist check
    try {
      validateTableNameFormat(table);
    } catch (error) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_TABLE_NAME',
          message: error instanceof Error ? error.message : 'Invalid table name format',
        },
      });
    }

    const collection = await getCollectionByTableAsync(table);

    if (!collection) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'COLLECTION_NOT_FOUND',
          message: `Collection '${table}' not found or not accessible`,
        },
      });
    }

    // Check if user has required role to access this collection
    if (!hasRequiredRole(userRole, collection.requiredRole)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Access denied. ${collection.requiredRole} role required for this collection.`,
        },
      });
    }

    // Get table schema from map
    const tableMap = getTableMap();
    const tableSchema = tableMap[table];
    if (!tableSchema) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'TABLE_SCHEMA_NOT_FOUND',
          message: `Table '${table}' not found in schema map`,
        },
      });
    }

    // Fetch record before deletion
    const data = await db
      .select()
      .from(tableSchema)
      .where(sql`id = ${id}`)
      .limit(1);

    if (data.length === 0) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'RECORD_NOT_FOUND',
          message: 'Record not found',
        },
      });
    }

    const deletedRecord = data[0];

    // RBAC: Check if user is trying to delete a superadmin record in users table
    if (table === 'users' && userRole !== 'superadmin') {
      const recordRole = (deletedRecord as { role?: string }).role;
      if (recordRole === 'superadmin') {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only superadmins can delete superadmin users.',
          },
        });
      }
    }

    // Execute DELETE query
    await db.execute(
      sql`DELETE FROM ${sql.identifier(table)} WHERE id = ${id}`
    );

    return reply.send({
      success: true,
      collection: collection.name,
      table: collection.table,
      record: deletedRecord,
      message: 'Record deleted successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to delete collection record');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'DELETE_FAILED',
        message: 'Failed to delete collection record',
      },
    });
  }
}

/**
 * Get collection column preferences
 * GET /api/admin/collections/:table/preferences
 */
async function getCollectionPreferences(
  request: FastifyRequest<{
    Params: { table: string };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { table } = request.params;
    const userRole = request.user?.role || 'user';

    const collection = await getCollectionByTableAsync(table);

    if (!collection) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'COLLECTION_NOT_FOUND',
          message: `Collection '${table}' not found or not accessible`,
        },
      });
    }

    // Check if user has required role to access this collection
    if (!hasRequiredRole(userRole, collection.requiredRole)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Access denied. ${collection.requiredRole} role required for this collection.`,
        },
      });
    }

    // Fetch preferences from database
    const preferences = await db
      .select()
      .from(collectionPreferences)
      .where(eq(collectionPreferences.tableName, table))
      .limit(1);

    // If no preferences exist, return default (first 4 non-timestamp columns)
    if (preferences.length === 0) {
      const defaultColumns = collection.columns
        .filter((col) => col.type !== 'timestamp' && col.type !== 'date')
        .slice(0, 4)
        .map((col) => col.name);

      return reply.send({
        success: true,
        preferences: {
          tableName: table,
          visibleColumns: defaultColumns,
          isDefault: true,
        },
      });
    }

    return reply.send({
      success: true,
      preferences: {
        tableName: preferences[0]!.tableName,
        visibleColumns: preferences[0]!.visibleColumns as string[],
        updatedBy: preferences[0]!.updatedBy,
        updatedAt: preferences[0]!.updatedAt,
        isDefault: false,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get collection preferences');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get collection preferences',
      },
    });
  }
}

/**
 * Update collection column preferences
 * PATCH /api/admin/collections/:table/preferences
 */
async function updateCollectionPreferences(
  request: FastifyRequest<{
    Params: { table: string };
    Body: { visibleColumns: string[] };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { table } = request.params;
    const { visibleColumns } = request.body;
    const userRole = request.user?.role || 'user';
    const userId = request.user?.id;

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User ID not found',
        },
      });
    }

    const collection = await getCollectionByTableAsync(table);

    if (!collection) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'COLLECTION_NOT_FOUND',
          message: `Collection '${table}' not found or not accessible`,
        },
      });
    }

    // Check if user has required role to access this collection
    if (!hasRequiredRole(userRole, collection.requiredRole)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Access denied. ${collection.requiredRole} role required for this collection.`,
        },
      });
    }

    // Validate visibleColumns array
    if (!Array.isArray(visibleColumns) || visibleColumns.length === 0) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_COLUMNS',
          message: 'visibleColumns must be a non-empty array',
        },
      });
    }

    // Validate that all columns exist in the collection
    const availableColumnNames = collection.columns.map((col) => col.name);
    const invalidColumns = visibleColumns.filter((col) => !availableColumnNames.includes(col));

    if (invalidColumns.length > 0) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_COLUMNS',
          message: `Invalid columns: ${invalidColumns.join(', ')}. Available columns: ${availableColumnNames.join(', ')}`,
        },
      });
    }

    // Upsert preferences (insert or update)
    const existingPreferences = await db
      .select()
      .from(collectionPreferences)
      .where(eq(collectionPreferences.tableName, table))
      .limit(1);

    if (existingPreferences.length > 0) {
      // Update existing preferences
      await db
        .update(collectionPreferences)
        .set({
          visibleColumns: visibleColumns as unknown as string[],
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(collectionPreferences.tableName, table));
    } else {
      // Insert new preferences
      await db.insert(collectionPreferences).values({
        tableName: table,
        visibleColumns: visibleColumns as unknown as string[],
        updatedBy: userId,
      });
    }

    // Fetch updated preferences
    const updated = await db
      .select()
      .from(collectionPreferences)
      .where(eq(collectionPreferences.tableName, table))
      .limit(1);

    return reply.send({
      success: true,
      preferences: {
        tableName: updated[0]!.tableName,
        visibleColumns: updated[0]!.visibleColumns as string[],
        updatedBy: updated[0]!.updatedBy,
        updatedAt: updated[0]!.updatedAt,
      },
      message: 'Column preferences updated successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to update collection preferences');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'UPDATE_FAILED',
        message: 'Failed to update collection preferences',
      },
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
            collections: { type: 'array' },
            total: { type: 'number' },
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

  // Update a record
  fastify.patch('/:table/data/:id', {
    schema: {
      description: 'Update a record in collection',
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
      body: {
        type: 'object',
        additionalProperties: true,
      },
    },
    handler: updateCollectionRecord,
  });

  // Delete a record
  fastify.delete('/:table/data/:id', {
    schema: {
      description: 'Delete a record from collection',
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
    handler: deleteCollectionRecord,
  });

  // Get collection column preferences
  fastify.get('/:table/preferences', {
    schema: {
      description: 'Get collection column visibility preferences',
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
    handler: getCollectionPreferences,
  });

  // Update collection column preferences
  fastify.patch('/:table/preferences', {
    schema: {
      description: 'Update collection column visibility preferences (applies globally)',
      tags: ['admin', 'collections'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['table'],
        properties: {
          table: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['visibleColumns'],
        properties: {
          visibleColumns: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
          },
        },
      },
    },
    handler: updateCollectionPreferences,
  });
}

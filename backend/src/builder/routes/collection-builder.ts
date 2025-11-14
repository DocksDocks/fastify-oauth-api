/**
 * Collection Builder Routes
 *
 * Routes for managing custom database collections (Strapi-like collection builder)
 * SUPERADMIN ONLY - Only superadmins can create/modify collections
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { collectionDefinitions } from '@/db/schema';
import type { JWTPayload } from '@/modules/auth/auth.types';
import { requireSuperadmin } from '@/middleware/authorize';
import { env } from '@/config/env';
import {
  generateCreateTableSQL,
  generateDrizzleSchema,
  generateBasicTests,
  writeMigrationFile,
  writeDrizzleSchemaFile,
  updateCustomCollectionsIndex,
  writeTestFile,
  updateCollectionDefinition as updateCollectionDefinitionService,
  type FieldType,
  type CollectionField,
  type CollectionIndex,
  type CollectionRelationship,
} from '../services/collection-builder.service';

/**
 * List all collection definitions
 * GET /api/admin/collection-builder/definitions
 */
async function listCollectionDefinitions(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    // Fetch all collection definitions
    const result = await db
      .select()
      .from(collectionDefinitions)
      .orderBy(desc(collectionDefinitions.createdAt));

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    _request.log.error({ error }, 'Failed to list collection definitions');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list collection definitions',
      },
    });
  }
}

/**
 * Get single collection definition
 * GET /api/admin/collection-builder/definitions/:id
 */
async function getCollectionDefinition(
  request: FastifyRequest<{
    Params: {
      id: string;
    };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { id } = request.params;

    // Validate ID
    const collectionId = parseInt(id, 10);
    if (isNaN(collectionId)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid collection ID',
        },
      });
    }

    // Fetch collection definition
    const [collection] = await db
      .select()
      .from(collectionDefinitions)
      .where(eq(collectionDefinitions.id, collectionId))
      .limit(1);

    if (!collection) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Collection definition not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: collection,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get collection definition');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get collection definition',
      },
    });
  }
}

/**
 * Create new collection definition
 * POST /api/admin/collection-builder/definitions
 */
async function createCollectionDefinition(
  request: FastifyRequest<{
    Body: {
      name: string;
      apiName: string;
      displayName: string;
      description?: string;
      icon?: string;
      fields: unknown[];
      indexes?: unknown[];
      relationships?: unknown[];
    };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const user = request.user as JWTPayload;

    // Check if running in development or test mode
    if (env.NODE_ENV !== 'development' && env.NODE_ENV !== 'test') {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'DEV_MODE_ONLY',
          message: 'Collection creation is only allowed in development mode',
        },
      });
    }

    const { name, apiName, displayName, description, icon, fields, indexes, relationships } =
      request.body;

    // Basic validation
    if (!name || !apiName || !displayName || !fields || fields.length === 0) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name, API name, display name, and at least one field are required',
        },
      });
    }

    // Check for duplicate name or apiName
    const [existingByName] = await db
      .select()
      .from(collectionDefinitions)
      .where(eq(collectionDefinitions.name, name))
      .limit(1);

    if (existingByName) {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'NAME_CONFLICT',
          message: 'A collection with this name already exists',
        },
      });
    }

    const [existingByApiName] = await db
      .select()
      .from(collectionDefinitions)
      .where(eq(collectionDefinitions.apiName, apiName))
      .limit(1);

    if (existingByApiName) {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'API_NAME_CONFLICT',
          message: 'A collection with this API name already exists',
        },
      });
    }

    // Check if table already exists in database
    const existingTables = await db.execute<{ table_name: string }>(
      sql`SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          AND LOWER(table_name) = LOWER(${name})`
    );

    if (existingTables && existingTables.length > 0) {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'TABLE_EXISTS',
          message: `A database table named "${name}" already exists. Please choose a different name.`,
        },
      });
    }

    // Create collection definition
    const [newCollection] = await db
      .insert(collectionDefinitions)
      .values({
        name,
        apiName,
        displayName,
        description,
        icon,
        fields,
        indexes,
        relationships,
        isSystem: false,
        createdBy: user.id,
      })
      .returning();

    if (!newCollection) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create collection definition',
        },
      });
    }

    // Validate and cast field types
    const validFieldTypes: FieldType[] = [
      'text',
      'longtext',
      'richtext',
      'integer',
      'decimal',
      'date',
      'datetime',
      'boolean',
      'enum',
      'json',
      'relation',
      'media',
    ];

    const validatedFields: CollectionField[] = fields.map((field: unknown) => {
      // Runtime validation of field type
      const fieldObj = field as Record<string, unknown>;
      if (!validFieldTypes.includes(fieldObj.type as FieldType)) {
        throw new Error(`Invalid field type: ${fieldObj.type}. Must be one of: ${validFieldTypes.join(', ')}`);
      }

      return {
        ...fieldObj,
        type: fieldObj.type as FieldType,
      } as CollectionField;
    });

    // Build collection definition for generators
    const collectionDefinition = {
      name,
      apiName,
      displayName,
      description,
      icon,
      fields: validatedFields,
      indexes: (indexes as CollectionIndex[]) || [],
      relationships: (relationships as CollectionRelationship[]) || [],
    };

    // Generate CREATE TABLE SQL
    const createTableSQL = generateCreateTableSQL(collectionDefinition);

    // Generate Drizzle schema
    const drizzleSchema = generateDrizzleSchema(collectionDefinition);

    // Generate basic tests
    const testCode = generateBasicTests(collectionDefinition);

    // Write all files
    const migrationFilename = await writeMigrationFile(name, createTableSQL);
    const schemaFilename = await writeDrizzleSchemaFile(name, drizzleSchema);
    await updateCustomCollectionsIndex(name); // Auto-export the new schema
    const testFilename = await writeTestFile(name, testCode);

    // Run migrations immediately to apply the new table
    try {
      const { runMigrations } = await import('@/db/migrate');
      await runMigrations();
      request.log.info({ migrationFile: migrationFilename }, 'Migration applied successfully');
    } catch (error) {
      request.log.error({ error, migrationFile: migrationFilename }, 'Failed to apply migration');
      // Continue anyway - migration can be applied manually
    }

    request.log.info(
      {
        collectionId: newCollection.id,
        name,
        createdBy: user.id,
        migrationFile: migrationFilename,
        schemaFile: schemaFilename,
        testFile: testFilename,
      },
      'Created collection definition with migration, schema, and tests - server will restart',
    );

    // Send response first
    reply.status(201).send({
      success: true,
      data: newCollection,
      files: {
        migration: migrationFilename,
        schema: schemaFilename,
        test: testFilename,
      },
    });

    // Trigger server restart by touching a watched file
    // tsx watch will detect the file change and restart the server
    // predev hook will run migrations on restart
    setImmediate(async () => {
      request.log.info('Triggering server restart to apply collection migration...');
      try {
        // Touch the server file to trigger tsx watch restart
        const { utimes } = await import('node:fs/promises');
        const { fileURLToPath } = await import('node:url');
        const __filename = fileURLToPath(import.meta.url);
        const now = new Date();
        await utimes(__filename, now, now);
        request.log.info('Server restart triggered successfully');
      } catch (error) {
        request.log.error({ error }, 'Failed to trigger server restart');
      }
    });

    return;
  } catch (error) {
    request.log.error({ error }, 'Failed to create collection definition');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create collection definition',
      },
    });
  }
}

/**
 * Update collection definition
 * PATCH /api/admin/collection-builder/definitions/:id
 * Enhanced to handle schema migrations and file updates
 */
async function updateCollectionDefinition(
  request: FastifyRequest<{
    Params: {
      id: string;
    };
    Body: {
      displayName?: string;
      description?: string;
      icon?: string;
      fields?: unknown[];
      indexes?: unknown[];
      relationships?: unknown[];
    };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const user = request.user as JWTPayload;
    const { id } = request.params;
    const { displayName, description, icon, fields, indexes, relationships } = request.body;

    // Validate ID
    const collectionId = parseInt(id, 10);
    if (isNaN(collectionId)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid collection ID',
        },
      });
    }

    // Check if collection exists
    const [existing] = await db
      .select()
      .from(collectionDefinitions)
      .where(eq(collectionDefinitions.id, collectionId))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Collection definition not found',
        },
      });
    }

    // Cannot modify system collections
    if (existing.isSystem) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'SYSTEM_COLLECTION',
          message: 'Cannot modify system collection',
        },
      });
    }

    // Build update object
    const updates: {
      displayName?: string;
      description?: string;
      icon?: string;
      fields?: CollectionField[];
      indexes?: CollectionIndex[];
      relationships?: CollectionRelationship[];
    } = {};

    if (displayName !== undefined) updates.displayName = displayName;
    if (description !== undefined) updates.description = description;
    if (icon !== undefined) updates.icon = icon;
    if (fields !== undefined) updates.fields = fields as CollectionField[];
    if (indexes !== undefined) updates.indexes = indexes as CollectionIndex[];
    if (relationships !== undefined) updates.relationships = relationships as CollectionRelationship[];

    // Use enhanced service function to handle migrations
    const result = await updateCollectionDefinitionService(collectionId, updates, user.id);

    const responseData: {
      collection: typeof result.collection;
      schemaChanges?: typeof result.schemaChanges;
      migrationFile?: string;
      needsRestart?: boolean;
    } = {
      collection: result.collection,
    };

    // Include schema changes and warnings if present
    if (result.schemaChanges) {
      responseData.schemaChanges = result.schemaChanges;
      responseData.migrationFile = result.migrationFile;
      responseData.needsRestart = true;

      request.log.info(
        {
          collectionId,
          name: existing.name,
          migrationFile: result.migrationFile,
          warnings: result.schemaChanges.warnings.length,
        },
        'Updated collection with schema changes - server will restart',
      );

      // Run migrations immediately to apply schema changes
      try {
        const { runMigrations } = await import('@/db/migrate');
        await runMigrations();
        request.log.info({ migrationFile: result.migrationFile }, 'Migration applied successfully');
      } catch (error) {
        request.log.error({ error, migrationFile: result.migrationFile }, 'Failed to apply migration');
        // Continue anyway - migration can be applied manually
      }

      // Send response first
      reply.send({
        success: true,
        data: responseData,
      });

      // Trigger server restart by touching a watched file
      setImmediate(async () => {
        request.log.info('Triggering server restart to reload schema...');
        try {
          const { utimes } = await import('node:fs/promises');
          const { fileURLToPath } = await import('node:url');
          const __filename = fileURLToPath(import.meta.url);
          const now = new Date();
          await utimes(__filename, now, now);
          request.log.info('Server restart triggered successfully');
        } catch (error) {
          request.log.error({ error }, 'Failed to trigger server restart');
        }
      });
    } else {
      // No schema changes, just metadata update
      request.log.info({ collectionId, updates: Object.keys(updates) }, 'Updated collection metadata (no schema changes)');

      return reply.send({
        success: true,
        data: responseData,
      });
    }
  } catch (error) {
    request.log.error({ error }, 'Failed to update collection definition');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update collection definition',
      },
    });
  }
}

/**
 * Delete collection definition
 * DELETE /api/admin/collection-builder/definitions/:id
 */
async function deleteCollectionDefinition(
  request: FastifyRequest<{
    Params: {
      id: string;
    };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { id } = request.params;

    // Validate ID
    const collectionId = parseInt(id, 10);
    if (isNaN(collectionId)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid collection ID',
        },
      });
    }

    // Check if collection exists
    const [existing] = await db
      .select()
      .from(collectionDefinitions)
      .where(eq(collectionDefinitions.id, collectionId))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Collection definition not found',
        },
      });
    }

    // Cannot delete system collections
    if (existing.isSystem) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'SYSTEM_COLLECTION',
          message: 'Cannot delete system collection',
        },
      });
    }

    // Delete collection definition (cascade will handle migrations)
    await db.delete(collectionDefinitions).where(eq(collectionDefinitions.id, collectionId));

    request.log.info({ collectionId, name: existing.name }, 'Deleted collection definition');

    return reply.send({
      success: true,
      message: 'Collection definition deleted successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to delete collection definition');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete collection definition',
      },
    });
  }
}

/**
 * Register all collection builder routes
 */
export async function collectionBuilderRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require authentication and superadmin role
  fastify.addHook('onRequest', fastify.authenticate);
  fastify.addHook('onRequest', requireSuperadmin);

  // GET /api/admin/collection-builder/definitions - List all
  fastify.get('/definitions', listCollectionDefinitions);

  // GET /api/admin/collection-builder/definitions/:id - Get single
  fastify.get('/definitions/:id', getCollectionDefinition);

  // POST /api/admin/collection-builder/definitions - Create
  fastify.post('/definitions', createCollectionDefinition);

  // PATCH /api/admin/collection-builder/definitions/:id - Update
  fastify.patch('/definitions/:id', updateCollectionDefinition);

  // DELETE /api/admin/collection-builder/definitions/:id - Delete
  fastify.delete('/definitions/:id', deleteCollectionDefinition);
}

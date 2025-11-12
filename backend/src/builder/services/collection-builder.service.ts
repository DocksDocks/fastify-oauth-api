/**
 * Collection Builder Service
 *
 * Handles schema generation, validation, and CRUD operations for custom collections.
 * Generates PostgreSQL DDL statements and Drizzle schema code.
 */

import { db } from '@/db/client';
import { collectionDefinitions } from '@/db/schema/collection-definitions';
import { eq, or } from 'drizzle-orm';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import env from '@/config/env';
import type {
  FieldType,
  CollectionField,
  CollectionIndex,
  CollectionRelationship,
  CollectionDefinitionInput,
  ValidationError,
  ValidationResult,
} from '../types/collection-builder.types';

// Re-export types for convenience
export type {
  FieldType,
  CollectionField,
  FieldValidation,
  RelationConfig,
  CollectionIndex,
  CollectionRelationship,
  CollectionDefinitionInput,
  ValidationError,
  ValidationResult,
} from '../types/collection-builder.types';

// ============================================================================
// Constants
// ============================================================================

const FIELD_TYPE_MAP: Record<FieldType, string> = {
  text: 'VARCHAR(255)',
  longtext: 'TEXT',
  richtext: 'TEXT',
  number: 'INTEGER', // Can be overridden with NUMERIC for decimals
  date: 'DATE',
  datetime: 'TIMESTAMP WITH TIME ZONE',
  boolean: 'BOOLEAN',
  enum: 'ENUM_TYPE', // Placeholder - actual enum type created dynamically
  json: 'JSONB',
  relation: 'INTEGER', // Foreign key
  media: 'TEXT', // File URL
};

const RESERVED_NAMES = [
  'user',
  'users',
  'admin',
  'admins',
  'system',
  'schema',
  'table',
  'database',
  'index',
  'key',
  'constraint',
  'trigger',
  'view',
  'procedure',
  'function',
];

const RESERVED_FIELD_NAMES = [
  'id',
  'created_at',
  'updated_at',
  'deleted_at',
];

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a collection definition
 * Checks naming conventions, reserved names, field configurations, etc.
 */
export function validateCollectionDefinition(
  definition: CollectionDefinitionInput,
): ValidationResult {
  const errors: ValidationError[] = [];

  // 1. Validate collection name
  if (!definition.name || !/^[a-z_]+$/.test(definition.name)) {
    errors.push({
      field: 'name',
      message: 'Name must be lowercase with underscores only (e.g., blog_posts)',
    });
  }

  // 2. Check for reserved names
  if (RESERVED_NAMES.includes(definition.name.toLowerCase())) {
    errors.push({
      field: 'name',
      message: `Name "${definition.name}" is reserved and cannot be used`,
    });
  }

  // 3. Validate API name
  if (!definition.apiName || !/^[a-z_]+$/.test(definition.apiName)) {
    errors.push({
      field: 'apiName',
      message: 'API name must be lowercase with underscores only',
    });
  }

  // 4. Validate display name
  if (!definition.displayName || definition.displayName.trim().length === 0) {
    errors.push({
      field: 'displayName',
      message: 'Display name is required',
    });
  }

  // 5. Validate fields
  if (!definition.fields || definition.fields.length === 0) {
    errors.push({
      field: 'fields',
      message: 'At least one field is required',
    });
  } else {
    // Check for duplicate field names
    const fieldNames = new Set<string>();
    definition.fields.forEach((field, index) => {
      if (fieldNames.has(field.name)) {
        errors.push({
          field: `fields[${index}].name`,
          message: `Duplicate field name: ${field.name}`,
        });
      }
      fieldNames.add(field.name);

      // Validate field name format
      if (!/^[a-z_][a-z0-9_]*$/.test(field.name)) {
        errors.push({
          field: `fields[${index}].name`,
          message: `Field name "${field.name}" must start with a letter and contain only lowercase letters, numbers, and underscores`,
        });
      }

      // Check for reserved field names
      if (RESERVED_FIELD_NAMES.includes(field.name)) {
        errors.push({
          field: `fields[${index}].name`,
          message: `Field name "${field.name}" is reserved and will be auto-generated`,
        });
      }

      // Validate enum fields
      if (field.type === 'enum') {
        if (!field.enumValues || field.enumValues.length === 0) {
          errors.push({
            field: `fields[${index}].enumValues`,
            message: 'Enum fields must have at least one value',
          });
        }
      }

      // Validate relation fields
      if (field.type === 'relation') {
        if (!field.relationConfig) {
          errors.push({
            field: `fields[${index}].relationConfig`,
            message: 'Relation fields must have relationConfig',
          });
        } else if (!field.relationConfig.targetCollection) {
          errors.push({
            field: `fields[${index}].relationConfig.targetCollection`,
            message: 'Relation must specify targetCollection',
          });
        }
      }

      // Validate number fields with decimal
      if (field.type === 'number' && field.numberType === 'decimal') {
        if (field.decimalPlaces === undefined || field.decimalPlaces < 0) {
          errors.push({
            field: `fields[${index}].decimalPlaces`,
            message: 'Decimal fields must specify decimalPlaces',
          });
        }
      }
    });
  }

  // 6. Validate indexes reference existing fields
  if (definition.indexes) {
    const fieldNames = new Set(definition.fields.map((f) => f.name));
    definition.indexes.forEach((index, i) => {
      index.fields.forEach((fieldName) => {
        if (!fieldNames.has(fieldName)) {
          errors.push({
            field: `indexes[${i}].fields`,
            message: `Index references non-existent field: ${fieldName}`,
          });
        }
      });

      // Validate index name
      if (!index.name || !/^[a-z_][a-z0-9_]*$/.test(index.name)) {
        errors.push({
          field: `indexes[${i}].name`,
          message: 'Index name must be lowercase with underscores',
        });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a collection name already exists in database
 */
export async function checkNamingConflicts(name: string, apiName: string): Promise<boolean> {
  const existing = await db
    .select()
    .from(collectionDefinitions)
    .where(or(eq(collectionDefinitions.name, name), eq(collectionDefinitions.apiName, apiName)))
    .limit(1);

  return existing.length > 0;
}

// ============================================================================
// SQL Generation Functions
// ============================================================================

/**
 * Convert camelCase to snake_case
 */
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Generate PostgreSQL data type from field definition
 */
function getPostgresType(field: CollectionField): string {
  // Handle number types (including decimals)
  if (field.type === 'number') {
    if (field.numberType === 'decimal' || field.precision || field.scale) {
      const precision = field.precision || 10;
      const scale = field.scale || field.decimalPlaces || 2;
      return `NUMERIC(${precision}, ${scale})`;
    }
    return 'INTEGER';
  }

  // Handle text types with custom length
  if (field.type === 'text' && field.max) {
    return `VARCHAR(${field.max})`;
  }

  // Handle enum types
  if (field.type === 'enum' && field.enumValues) {
    // Enum type will be created separately
    const enumTypeName = `${toSnakeCase(field.name)}_enum`;
    return enumTypeName;
  }

  // Use the type map for other types
  return FIELD_TYPE_MAP[field.type] || 'TEXT';
}

/**
 * Generate CREATE TABLE SQL statement
 */
export function generateCreateTableSQL(definition: CollectionDefinitionInput): string {
  const tableName = definition.name;
  const lines: string[] = [];

  // Add standard columns
  lines.push('  id SERIAL PRIMARY KEY');

  // Add custom fields
  definition.fields.forEach((field) => {
    const columnName = toSnakeCase(field.name);
    const dataType = getPostgresType(field);
    const constraints: string[] = [];

    if (field.required) {
      constraints.push('NOT NULL');
    }

    if (field.unique) {
      constraints.push('UNIQUE');
    }

    if (field.defaultValue !== undefined) {
      if (typeof field.defaultValue === 'string') {
        // Special SQL functions for date/datetime fields (don't quote them)
        const specialFunctions = ['NOW', 'CURRENT_DATE', 'CURRENT_TIMESTAMP', 'CURRENT_TIME'];
        const defaultValueUpper = field.defaultValue.toUpperCase();

        if (specialFunctions.includes(defaultValueUpper)) {
          // Use function with parentheses for NOW, otherwise use as-is
          const sqlFunction = defaultValueUpper === 'NOW' ? 'NOW()' : defaultValueUpper;
          constraints.push(`DEFAULT ${sqlFunction}`);
        } else {
          // Regular string values need quotes
          constraints.push(`DEFAULT '${field.defaultValue}'`);
        }
      } else if (typeof field.defaultValue === 'boolean') {
        constraints.push(`DEFAULT ${field.defaultValue}`);
      } else {
        constraints.push(`DEFAULT ${field.defaultValue}`);
      }
    }

    const constraintStr = constraints.length > 0 ? ` ${constraints.join(' ')}` : '';
    lines.push(`  ${columnName} ${dataType}${constraintStr}`);
  });

  // Add timestamp columns
  lines.push('  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()');
  lines.push('  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()');

  // Create enum types first if needed
  const enumStatements: string[] = [];
  definition.fields.forEach((field) => {
    if (field.type === 'enum' && field.enumValues) {
      const enumTypeName = `${toSnakeCase(field.name)}_enum`;
      const values = field.enumValues.map((v) => `'${v}'`).join(', ');
      enumStatements.push(`CREATE TYPE ${enumTypeName} AS ENUM (${values});`);
    }
  });

  // Build CREATE TABLE statement
  let sql = '';
  if (enumStatements.length > 0) {
    sql += enumStatements.join('\n') + '\n\n';
  }

  sql += `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;
  sql += lines.join(',\n');
  sql += '\n);';

  // Add foreign key constraints
  const fkStatements: string[] = [];
  definition.fields.forEach((field) => {
    if (field.type === 'relation' && field.relationConfig) {
      const columnName = toSnakeCase(field.name);
      const targetTable = field.relationConfig.targetCollection;
      const onDelete = field.relationConfig.cascadeDelete ? 'CASCADE' : 'RESTRICT';
      const fkName = field.relationConfig.foreignKeyName || `fk_${tableName}_${columnName}`;

      fkStatements.push(
        `ALTER TABLE ${tableName} ADD CONSTRAINT ${fkName} FOREIGN KEY (${columnName}) REFERENCES ${targetTable}(id) ON DELETE ${onDelete};`,
      );
    }
  });

  if (fkStatements.length > 0) {
    sql += '\n\n' + fkStatements.join('\n');
  }

  // Add indexes
  if (definition.indexes && definition.indexes.length > 0) {
    const indexStatements: string[] = [];
    definition.indexes.forEach((index) => {
      const indexType = index.unique ? 'UNIQUE INDEX' : 'INDEX';
      const columns = index.fields.map(toSnakeCase).join(', ');
      indexStatements.push(`CREATE ${indexType} ${index.name} ON ${tableName}(${columns});`);
    });
    sql += '\n\n' + indexStatements.join('\n');
  }

  return sql;
}

/**
 * Generate Drizzle schema TypeScript code
 */
export function generateDrizzleSchema(definition: CollectionDefinitionInput): string {
  const tableName = definition.name;
  const schemaName = tableName.replace(/_/g, '');

  // Track which Drizzle types are actually used
  const usedTypes = new Set<string>();
  usedTypes.add('pgTable');
  usedTypes.add('serial');
  usedTypes.add('timestamp'); // Always used for createdAt/updatedAt

  let needsSqlImport = false;

  // First pass: determine which types are needed
  definition.fields.forEach((field) => {
    switch (field.type) {
      case 'text':
        usedTypes.add('varchar');
        break;
      case 'longtext':
      case 'richtext':
      case 'media':
        usedTypes.add('text');
        break;
      case 'number':
        if (field.numberType === 'decimal' || field.precision || field.scale) {
          usedTypes.add('numeric');
        } else {
          usedTypes.add('integer');
        }
        break;
      case 'boolean':
        usedTypes.add('boolean');
        break;
      case 'json':
        usedTypes.add('jsonb');
        break;
      case 'date':
        usedTypes.add('date');
        break;
      case 'datetime':
        usedTypes.add('timestamp');
        break;
      case 'relation':
        usedTypes.add('integer');
        break;
      default:
        usedTypes.add('text');
    }

    // Check if we need sql import for special default values
    if (field.defaultValue && typeof field.defaultValue === 'string') {
      const specialFunctions = ['CURRENT_DATE', 'CURRENT_TIMESTAMP', 'CURRENT_TIME'];
      if (specialFunctions.includes(field.defaultValue.toUpperCase())) {
        needsSqlImport = true;
      }
    }
  });

  const lines: string[] = [];

  // Build import statement with only used types
  const sortedTypes = Array.from(usedTypes).sort();
  lines.push(`import { ${sortedTypes.join(', ')} } from 'drizzle-orm/pg-core';`);

  // Add sql import if needed
  if (needsSqlImport) {
    lines.push(`import { sql } from 'drizzle-orm';`);
  }

  lines.push('');
  lines.push(`export const ${schemaName} = pgTable('${tableName}', {`);
  lines.push('  id: serial(\'id\').primaryKey(),');

  definition.fields.forEach((field) => {
    const columnName = toSnakeCase(field.name);
    let drizzleType = '';

    switch (field.type) {
      case 'text':
        // Use custom length if provided, otherwise default to 255
        if (field.max) {
          drizzleType = `varchar('${columnName}', { length: ${field.max} })`;
        } else {
          drizzleType = `varchar('${columnName}', { length: 255 })`;
        }
        break;
      case 'longtext':
      case 'richtext':
      case 'media':
        drizzleType = `text('${columnName}')`;
        break;
      case 'number':
        // Handle decimals with precision and scale
        if (field.numberType === 'decimal' || field.precision || field.scale) {
          const precision = field.precision || 10;
          const scale = field.scale || field.decimalPlaces || 2;
          drizzleType = `numeric('${columnName}', { precision: ${precision}, scale: ${scale} })`;
        } else {
          drizzleType = `integer('${columnName}')`;
        }
        break;
      case 'boolean':
        drizzleType = `boolean('${columnName}')`;
        break;
      case 'json':
        drizzleType = `jsonb('${columnName}')`;
        break;
      case 'date':
        drizzleType = `date('${columnName}')`;
        break;
      case 'datetime':
        drizzleType = `timestamp('${columnName}', { withTimezone: true })`;
        break;
      case 'relation':
        drizzleType = `integer('${columnName}')`;
        break;
      default:
        drizzleType = `text('${columnName}')`;
    }

    // Add modifiers
    let modifiers = '';
    if (field.required) {
      modifiers += '.notNull()';
    }
    if (field.unique) {
      modifiers += '.unique()';
    }

    // Add default value if provided (skip if null or undefined)
    if (field.defaultValue !== undefined && field.defaultValue !== null) {
      if (typeof field.defaultValue === 'string') {
        // Check if it's a SQL function like NOW, CURRENT_DATE, etc.
        const specialFunctions = ['NOW', 'CURRENT_DATE', 'CURRENT_TIMESTAMP', 'CURRENT_TIME'];
        const defaultValueUpper = field.defaultValue.toUpperCase();

        if (defaultValueUpper === 'NOW') {
          modifiers += '.defaultNow()';
        } else if (specialFunctions.includes(defaultValueUpper)) {
          // For other SQL functions, use sql`` template
          modifiers += `.default(sql\`${defaultValueUpper}\`)`;
        } else {
          // Regular string value - but check if it's a string representation of a boolean
          if (field.type === 'boolean') {
            // Convert string 'true'/'false' to actual boolean
            const boolValue = field.defaultValue.toLowerCase() === 'true';
            modifiers += `.default(${boolValue})`;
          } else {
            // Regular string value
            modifiers += `.default('${field.defaultValue}')`;
          }
        }
      } else if (typeof field.defaultValue === 'boolean') {
        modifiers += `.default(${field.defaultValue})`;
      } else if (typeof field.defaultValue === 'number') {
        modifiers += `.default(${field.defaultValue})`;
      } else {
        modifiers += `.default(${JSON.stringify(field.defaultValue)})`;
      }
    }

    lines.push(`  ${field.name}: ${drizzleType}${modifiers},`);
  });

  lines.push('  createdAt: timestamp(\'created_at\', { withTimezone: true }).notNull().defaultNow(),');
  lines.push('  updatedAt: timestamp(\'updated_at\', { withTimezone: true }).notNull().defaultNow(),');
  lines.push('});');

  return lines.join('\n');
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Get all collection definitions
 */
export async function getAllCollectionDefinitions(): Promise<
  Array<typeof collectionDefinitions.$inferSelect>
> {
  return await db.select().from(collectionDefinitions).orderBy(collectionDefinitions.name);
}

/**
 * Get a single collection definition by ID
 */
export async function getCollectionDefinitionById(
  id: number,
): Promise<(typeof collectionDefinitions.$inferSelect) | undefined> {
  const [definition] = await db
    .select()
    .from(collectionDefinitions)
    .where(eq(collectionDefinitions.id, id))
    .limit(1);

  return definition;
}

/**
 * Create a new collection definition
 */
export async function createCollectionDefinition(
  definition: CollectionDefinitionInput,
  userId: number,
): Promise<typeof collectionDefinitions.$inferSelect> {
  // Validate definition
  const validation = validateCollectionDefinition(definition);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.map((e) => e.message).join(', ')}`);
  }

  // Check for naming conflicts
  const hasConflict = await checkNamingConflicts(definition.name, definition.apiName);
  if (hasConflict) {
    throw new Error(`Collection with name "${definition.name}" or API name "${definition.apiName}" already exists`);
  }

  // Insert into database
  const [newCollection] = await db
    .insert(collectionDefinitions)
    .values({
      name: definition.name,
      apiName: definition.apiName,
      displayName: definition.displayName,
      description: definition.description,
      icon: definition.icon,
      fields: definition.fields as unknown as Record<string, unknown>,
      indexes: definition.indexes as unknown as Record<string, unknown>,
      relationships: definition.relationships as unknown as Record<string, unknown>,
      isSystem: false,
      createdBy: userId,
    })
    .returning();

  if (!newCollection) {
    throw new Error('Failed to create collection definition');
  }

  return newCollection;
}

/**
 * Update an existing collection definition
 */
export async function updateCollectionDefinition(
  id: number,
  updates: Partial<CollectionDefinitionInput>,
  _userId: number,
): Promise<typeof collectionDefinitions.$inferSelect> {
  // Get existing definition
  const existing = await getCollectionDefinitionById(id);
  if (!existing) {
    throw new Error(`Collection definition with ID ${id} not found`);
  }

  // Prevent updating system collections
  if (existing.isSystem) {
    throw new Error('Cannot update system collections');
  }

  // Merge updates with existing definition for validation
  const mergedDefinition: CollectionDefinitionInput = {
    name: updates.name || existing.name,
    apiName: updates.apiName || existing.apiName,
    displayName: updates.displayName || existing.displayName,
    description: updates.description !== undefined ? updates.description : (existing.description ?? undefined),
    icon: updates.icon !== undefined ? updates.icon : (existing.icon ?? undefined),
    fields: updates.fields || (existing.fields as unknown as CollectionField[]),
    indexes: updates.indexes || (existing.indexes as unknown as CollectionIndex[]),
    relationships:
      updates.relationships || (existing.relationships as unknown as CollectionRelationship[]),
  };

  // Validate merged definition
  const validation = validateCollectionDefinition(mergedDefinition);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.map((e) => e.message).join(', ')}`);
  }

  // Build update data
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (updates.name) updateData.name = updates.name;
  if (updates.apiName) updateData.apiName = updates.apiName;
  if (updates.displayName) updateData.displayName = updates.displayName;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.icon !== undefined) updateData.icon = updates.icon;
  if (updates.fields) updateData.fields = updates.fields;
  if (updates.indexes) updateData.indexes = updates.indexes;
  if (updates.relationships) updateData.relationships = updates.relationships;

  // Update in database
  const [updated] = await db
    .update(collectionDefinitions)
    .set(updateData)
    .where(eq(collectionDefinitions.id, id))
    .returning();

  if (!updated) {
    throw new Error('Failed to update collection definition');
  }

  return updated;
}

/**
 * Delete a collection definition
 */
export async function deleteCollectionDefinition(id: number): Promise<void> {
  // Get existing definition
  const existing = await getCollectionDefinitionById(id);
  if (!existing) {
    throw new Error(`Collection definition with ID ${id} not found`);
  }

  // Prevent deleting system collections
  if (existing.isSystem) {
    throw new Error('Cannot delete system collections');
  }

  // Delete from database (will cascade to related migration records)
  await db.delete(collectionDefinitions).where(eq(collectionDefinitions.id, id));
}

/**
 * Write a migration file for a new collection
 */
export async function writeMigrationFile(collectionName: string, sql: string): Promise<string> {
  // Skip file writing in test environment
  if (env.NODE_ENV === 'test') {
    return `test-migration-${collectionName}.sql`;
  }

  // Get the migrations directory
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const migrationsDir = path.join(__dirname, '../../db/migrations');
  const metaDir = path.join(migrationsDir, 'meta');
  const journalPath = path.join(metaDir, '_journal.json');

  // Read existing migrations from journal
  const journalContent = fs.readFileSync(journalPath, 'utf-8');
  const journal = JSON.parse(journalContent);

  // Get next migration number
  const existingMigrations = journal.entries || [];
  const nextNumber = existingMigrations.length;
  const migrationNumber = String(nextNumber).padStart(4, '0');

  // Create migration filename
  const timestamp = Date.now();
  const safeCollectionName = collectionName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const migrationName = `${migrationNumber}_create_${safeCollectionName}_table`;
  const migrationFilename = `${migrationName}.sql`;
  const migrationPath = path.join(migrationsDir, migrationFilename);

  // Write the migration file
  const migrationContent = `-- Create ${collectionName} table
-- Generated by Collection Builder
-- ${new Date().toISOString()}

${sql}
`;

  fs.writeFileSync(migrationPath, migrationContent, 'utf-8');

  // Update the journal
  journal.entries.push({
    idx: nextNumber,
    version: '7',
    when: timestamp,
    tag: migrationName,
    breakpoints: true,
  });

  fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2), 'utf-8');

  return migrationFilename;
}

/**
 * Write a Drizzle schema file for a new collection
 */
export async function writeDrizzleSchemaFile(
  collectionName: string,
  schemaCode: string,
): Promise<string> {
  // Skip file writing in test environment
  if (env.NODE_ENV === 'test') {
    return `test-schema-${collectionName}.ts`;
  }

  // Get the custom_collections directory
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const customCollectionsDir = path.join(__dirname, '../../db/schema/custom_collections');

  // Create directory if it doesn't exist
  if (!fs.existsSync(customCollectionsDir)) {
    fs.mkdirSync(customCollectionsDir, { recursive: true });
  }

  // Create schema filename (e.g., test_products -> test-products.ts)
  const kebabName = collectionName.toLowerCase().replace(/_/g, '-');
  const schemaFilename = `${kebabName}.ts`;
  const schemaPath = path.join(customCollectionsDir, schemaFilename);

  // Write the schema file with a header comment
  const schemaContent = `/**
 * ${collectionName} Collection Schema
 * Generated by Collection Builder
 * ${new Date().toISOString()}
 *
 * This file is auto-generated. Manual modifications may be overwritten.
 */

${schemaCode}
`;

  fs.writeFileSync(schemaPath, schemaContent, 'utf-8');

  return schemaFilename;
}

/**
 * Generate basic Vitest tests for a new collection
 */
export function generateBasicTests(definition: CollectionDefinitionInput): string {
  const tableName = definition.name;
  const schemaName = tableName.replace(/_/g, '');
  const kebabName = tableName.replace(/_/g, '-');

  // Build sample data for creating a record
  const sampleData: Record<string, unknown> = {};
  definition.fields.forEach((field) => {
    if (field.type === 'text' || field.type === 'longtext' || field.type === 'richtext') {
      sampleData[field.name] = `Sample ${field.name}`;
    } else if (field.type === 'number') {
      sampleData[field.name] = field.numberType === 'decimal' ? 99.99 : 42;
    } else if (field.type === 'boolean') {
      sampleData[field.name] = true;
    } else if (field.type === 'date' || field.type === 'datetime') {
      sampleData[field.name] = 'new Date()';
    } else if (field.type === 'json') {
      sampleData[field.name] = "{ key: 'value' }";
    } else if (field.type === 'enum' && field.enumValues && field.enumValues.length > 0) {
      sampleData[field.name] = `'${field.enumValues[0]}'`;
    } else {
      sampleData[field.name] = `'sample_value'`;
    }
  });

  // Convert sample data to test code
  const sampleDataLines = Object.entries(sampleData)
    .map(([key, value]) => {
      // Check if value is already code (starts with 'new' or is an object literal)
      const isCode = typeof value === 'string' && (value.startsWith('new ') || value.startsWith('{'));
      return `      ${key}: ${isCode ? value : JSON.stringify(value)},`;
    })
    .join('\n');

  // Ensure we have at least one field
  if (definition.fields.length === 0) {
    throw new Error('Cannot generate tests for collection with no fields');
  }

  // Get required fields for negative test
  const requiredFields = definition.fields.filter((f) => f.required);
  const firstRequiredField = requiredFields.length > 0 ? requiredFields[0]!.name : null;

  const lines: string[] = [];
  lines.push(`/**`);
  lines.push(` * ${definition.displayName} Collection Tests`);
  lines.push(` * Generated by Collection Builder`);
  lines.push(` * ${new Date().toISOString()}`);
  lines.push(` *`);
  lines.push(` * This file is auto-generated. You can modify these tests as needed.`);
  lines.push(` */`);
  lines.push('');
  lines.push(`import { describe, it, expect, beforeAll, afterEach } from 'vitest';`);
  lines.push(`import { db } from '@/db/client';`);
  lines.push(`import { ${schemaName} } from '@/db/schema/custom_collections/${kebabName}';`);
  lines.push(`import { eq } from 'drizzle-orm';`);
  lines.push('');
  lines.push(`describe('${definition.displayName} Collection', () => {`);
  lines.push(`  beforeAll(async () => {`);
  lines.push(`    // Setup: Clear any existing test data`);
  lines.push(`    await db.delete(${schemaName}).execute();`);
  lines.push(`  });`);
  lines.push('');
  lines.push(`  afterEach(async () => {`);
  lines.push(`    // Cleanup: Clear test data after each test`);
  lines.push(`    await db.delete(${schemaName}).execute();`);
  lines.push(`  });`);
  lines.push('');
  lines.push(`  it('should create a new ${tableName} record', async () => {`);
  lines.push(`    const [newRecord] = await db`);
  lines.push(`      .insert(${schemaName})`);
  lines.push(`      .values({`);
  lines.push(sampleDataLines);
  lines.push(`      })`);
  lines.push(`      .returning();`);
  lines.push('');
  lines.push(`    expect(newRecord).toBeDefined();`);
  lines.push(`    expect(newRecord.id).toBeGreaterThan(0);`);
  lines.push(`  });`);
  lines.push('');
  lines.push(`  it('should read ${tableName} records', async () => {`);
  lines.push(`    // Create a record first`);
  lines.push(`    const [created] = await db`);
  lines.push(`      .insert(${schemaName})`);
  lines.push(`      .values({`);
  lines.push(sampleDataLines);
  lines.push(`      })`);
  lines.push(`      .returning();`);
  lines.push('');
  lines.push(`    // Read all records`);
  lines.push(`    const records = await db.select().from(${schemaName}).execute();`);
  lines.push('');
  lines.push(`    expect(records).toHaveLength(1);`);
  lines.push(`    expect(records[0].id).toBe(created.id);`);
  lines.push(`  });`);
  lines.push('');
  lines.push(`  it('should update a ${tableName} record', async () => {`);
  lines.push(`    // Create a record first`);
  lines.push(`    const [created] = await db`);
  lines.push(`      .insert(${schemaName})`);
  lines.push(`      .values({`);
  lines.push(sampleDataLines);
  lines.push(`      })`);
  lines.push(`      .returning();`);
  lines.push('');
  lines.push(`    // Update the record`);
  lines.push(`    const [updated] = await db`);
  lines.push(`      .update(${schemaName})`);
  lines.push(`      .set({ ${definition.fields[0]!.name}: ${sampleData[definition.fields[0]!.name] === 'new Date()' ? 'new Date()' : `'Updated value'`} })`);
  lines.push(`      .where(eq(${schemaName}.id, created.id))`);
  lines.push(`      .returning();`);
  lines.push('');
  lines.push(`    expect(updated).toBeDefined();`);
  lines.push(`    expect(updated.id).toBe(created.id);`);
  lines.push(`  });`);
  lines.push('');
  lines.push(`  it('should delete a ${tableName} record', async () => {`);
  lines.push(`    // Create a record first`);
  lines.push(`    const [created] = await db`);
  lines.push(`      .insert(${schemaName})`);
  lines.push(`      .values({`);
  lines.push(sampleDataLines);
  lines.push(`      })`);
  lines.push(`      .returning();`);
  lines.push('');
  lines.push(`    // Delete the record`);
  lines.push(`    await db.delete(${schemaName}).where(eq(${schemaName}.id, created.id)).execute();`);
  lines.push('');
  lines.push(`    // Verify deletion`);
  lines.push(`    const records = await db.select().from(${schemaName}).execute();`);
  lines.push(`    expect(records).toHaveLength(0);`);
  lines.push(`  });`);

  // Add test for required fields if any exist
  if (firstRequiredField) {
    lines.push('');
    lines.push(`  it('should fail when required field "${firstRequiredField}" is missing', async () => {`);
    lines.push(`    // Attempt to create record without required field`);
    lines.push(`    const invalidData = {`);
    const sampleDataWithoutRequired = Object.entries(sampleData)
      .filter(([key]) => key !== firstRequiredField)
      .map(([key, value]) => {
        const isCode = typeof value === 'string' && (value.startsWith('new ') || value.startsWith('{'));
        return `      ${key}: ${isCode ? value : JSON.stringify(value)},`;
      })
      .join('\n');
    lines.push(sampleDataWithoutRequired);
    lines.push(`    };`);
    lines.push('');
    lines.push(`    await expect(async () => {`);
    lines.push(`      await db.insert(${schemaName}).values(invalidData as any).execute();`);
    lines.push(`    }).rejects.toThrow();`);
    lines.push(`  });`);
  }

  lines.push(`});`);

  return lines.join('\n');
}

/**
 * Write a test file for a new collection
 */
export async function writeTestFile(collectionName: string, testCode: string): Promise<string> {
  // Skip file writing in test environment
  if (env.NODE_ENV === 'test') {
    return `test-file-${collectionName}.test.ts`;
  }

  // Get the test directory
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const testDir = path.join(__dirname, '../../../test/collections');

  // Create directory if it doesn't exist
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // Create test filename (e.g., test_products -> test-products.test.ts)
  const kebabName = collectionName.toLowerCase().replace(/_/g, '-');
  const testFilename = `${kebabName}.test.ts`;
  const testPath = path.join(testDir, testFilename);

  // Write the test file
  fs.writeFileSync(testPath, testCode, 'utf-8');

  return testFilename;
}

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
  SchemaChanges,
  FieldChange,
  FieldRename,
  IndexChange,
  MigrationWarning,
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
  SchemaChanges,
  FieldChange,
  FieldRename,
  IndexChange,
  MigrationWarning,
} from '../types/collection-builder.types';

// ============================================================================
// Constants
// ============================================================================

const FIELD_TYPE_MAP: Record<FieldType, string> = {
  text: 'VARCHAR(255)',
  longtext: 'TEXT',
  richtext: 'TEXT',
  integer: 'INTEGER',
  decimal: 'NUMERIC', // Precision and scale added dynamically
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

      // Validate decimal fields
      if (field.type === 'decimal') {
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
// Schema Comparison Functions
// ============================================================================

/**
 * Compare two collection definitions and identify schema changes
 * Used to generate migration warnings and ALTER TABLE statements
 */
export function compareCollectionSchemas(
  oldDefinition: CollectionDefinitionInput,
  newDefinition: CollectionDefinitionInput,
): SchemaChanges {
  const warnings: MigrationWarning[] = [];
  const addedFields: CollectionField[] = [];
  const removedFields: CollectionField[] = [];
  const renamedFields: FieldRename[] = [];
  const modifiedFields: FieldChange[] = [];

  // Create maps for easier lookup
  const oldFieldsMap = new Map(oldDefinition.fields.map((f) => [f.name, f]));
  const newFieldsMap = new Map(newDefinition.fields.map((f) => [f.name, f]));

  // Find added fields
  newDefinition.fields.forEach((newField) => {
    if (!oldFieldsMap.has(newField.name)) {
      addedFields.push(newField);

      // Warning if added field is required without default
      if (newField.required && newField.defaultValue === undefined) {
        warnings.push({
          type: 'breaking_change',
          message: `Adding required field "${newField.name}" without a default value will fail if table has existing data`,
          fieldName: newField.name,
          severity: 'high',
        });
      }
    }
  });

  // Find removed and modified fields
  oldDefinition.fields.forEach((oldField) => {
    const newField = newFieldsMap.get(oldField.name);

    if (!newField) {
      // Field was removed (might be a rename, checked later)
      removedFields.push(oldField);
    } else {
      // Field exists in both - check for modifications
      const changes: Array<'type' | 'required' | 'unique' | 'defaultValue' | 'validation' | 'max' | 'precision' | 'scale' | 'enumValues'> = [];

      // Check type changes
      if (oldField.type !== newField.type) {
        changes.push('type');
        warnings.push({
          type: 'breaking_change',
          message: `Changing field "${oldField.name}" from ${oldField.type} to ${newField.type} may cause data loss or type conversion errors`,
          fieldName: oldField.name,
          severity: 'high',
        });
      }

      // Check required constraint
      if (oldField.required !== newField.required) {
        changes.push('required');
        if (newField.required && !oldField.required) {
          warnings.push({
            type: 'breaking_change',
            message: `Making field "${oldField.name}" required may fail if existing rows have NULL values`,
            fieldName: oldField.name,
            severity: 'high',
          });
        }
      }

      // Check unique constraint
      if (oldField.unique !== newField.unique) {
        changes.push('unique');
        if (newField.unique && !oldField.unique) {
          warnings.push({
            type: 'breaking_change',
            message: `Adding UNIQUE constraint to field "${oldField.name}" may fail if duplicate values exist`,
            fieldName: oldField.name,
            severity: 'medium',
          });
        }
      }

      // Check default value changes
      if (JSON.stringify(oldField.defaultValue) !== JSON.stringify(newField.defaultValue)) {
        changes.push('defaultValue');
        warnings.push({
          type: 'info',
          message: `Default value for field "${oldField.name}" changed. This only affects new rows.`,
          fieldName: oldField.name,
          severity: 'low',
        });
      }

      // Check validation changes
      if (JSON.stringify(oldField.validation) !== JSON.stringify(newField.validation)) {
        changes.push('validation');
      }

      // Check max length for text fields
      if (oldField.max !== newField.max) {
        changes.push('max');
        if (newField.max && oldField.max && newField.max < oldField.max) {
          warnings.push({
            type: 'data_loss',
            message: `Reducing max length of field "${oldField.name}" from ${oldField.max} to ${newField.max} may truncate existing data`,
            fieldName: oldField.name,
            severity: 'high',
          });
        }
      }

      // Check precision/scale for decimal fields
      if (oldField.precision !== newField.precision || oldField.scale !== newField.scale) {
        if (oldField.precision !== newField.precision) changes.push('precision');
        if (oldField.scale !== newField.scale) changes.push('scale');

        warnings.push({
          type: 'breaking_change',
          message: `Changing precision/scale of field "${oldField.name}" may cause data loss or rounding`,
          fieldName: oldField.name,
          severity: 'medium',
        });
      }

      // Check enum values changes
      if (JSON.stringify(oldField.enumValues) !== JSON.stringify(newField.enumValues)) {
        changes.push('enumValues');

        const oldEnums = new Set(oldField.enumValues || []);
        const newEnums = new Set(newField.enumValues || []);
        const removedEnums = Array.from(oldEnums).filter((e) => !newEnums.has(e));

        if (removedEnums.length > 0) {
          warnings.push({
            type: 'breaking_change',
            message: `Removing enum values [${removedEnums.join(', ')}] from field "${oldField.name}" may cause errors if these values exist in the database`,
            fieldName: oldField.name,
            severity: 'high',
          });
        }
      }

      if (changes.length > 0) {
        modifiedFields.push({
          oldField,
          newField,
          changes,
        });
      }
    }
  });

  // Detect field renames
  // A rename is detected when a removed field and an added field have:
  // - Same type
  // - Same required/unique/default properties
  // This is a heuristic - we can't be 100% certain it's a rename vs remove+add
  const processedAdded = new Set<number>();
  const processedRemoved = new Set<number>();

  removedFields.forEach((removedField, removedIndex) => {
    if (processedRemoved.has(removedIndex)) return;

    // Look for a matching added field
    addedFields.forEach((addedField, addedIndex) => {
      if (processedAdded.has(addedIndex)) return;

      // Check if fields match (same type and core properties)
      const isSameType = removedField.type === addedField.type;
      const isSameRequired = removedField.required === addedField.required;
      const isSameUnique = removedField.unique === addedField.unique;
      const isSameDefault = JSON.stringify(removedField.defaultValue) === JSON.stringify(addedField.defaultValue);

      // For enum fields, also check if enum values match
      let enumMatches = true;
      if (removedField.type === 'enum' && addedField.type === 'enum') {
        enumMatches = JSON.stringify(removedField.enumValues) === JSON.stringify(addedField.enumValues);
      }

      // For decimal fields, check if precision/scale settings match
      let decimalMatches = true;
      if (removedField.type === 'decimal' && addedField.type === 'decimal') {
        decimalMatches =
          removedField.precision === addedField.precision &&
          removedField.scale === addedField.scale &&
          removedField.decimalPlaces === addedField.decimalPlaces;
      }

      // If all properties match, this is likely a rename
      if (isSameType && isSameRequired && isSameUnique && isSameDefault && enumMatches && decimalMatches) {
        // Mark as rename
        renamedFields.push({
          oldName: removedField.name,
          newName: addedField.name,
          field: addedField,
        });

        // Mark as processed so they're not included in added/removed
        processedAdded.add(addedIndex);
        processedRemoved.add(removedIndex);

        // Add warning about rename
        warnings.push({
          type: 'info',
          message: `Field "${removedField.name}" appears to have been renamed to "${addedField.name}". The column will be renamed preserving all existing data.`,
          fieldName: removedField.name,
          severity: 'low',
        });
      }
    });
  });

  // Filter out renamed fields from added and removed arrays
  const finalAddedFields = addedFields.filter((_, index) => !processedAdded.has(index));
  const finalRemovedFields = removedFields.filter((_, index) => !processedRemoved.has(index));

  // Add warnings for actual removals (after filtering out renames)
  finalRemovedFields.forEach((field) => {
    warnings.push({
      type: 'data_loss',
      message: `Removing field "${field.name}" will permanently delete all data in this column`,
      fieldName: field.name,
      severity: 'high',
    });
  });

  // Compare indexes
  const oldIndexesMap = new Map((oldDefinition.indexes || []).map((idx) => [idx.name, idx]));
  const newIndexesMap = new Map((newDefinition.indexes || []).map((idx) => [idx.name, idx]));

  const addedIndexes: CollectionIndex[] = [];
  const removedIndexes: CollectionIndex[] = [];
  const modifiedIndexes: IndexChange[] = [];

  // Find added indexes
  (newDefinition.indexes || []).forEach((newIndex) => {
    if (!oldIndexesMap.has(newIndex.name)) {
      addedIndexes.push(newIndex);
      warnings.push({
        type: 'performance',
        message: `Adding index "${newIndex.name}" may take time on large tables`,
        severity: 'low',
      });
    }
  });

  // Find removed and modified indexes
  (oldDefinition.indexes || []).forEach((oldIndex) => {
    const newIndex = newIndexesMap.get(oldIndex.name);

    if (!newIndex) {
      removedIndexes.push(oldIndex);
      warnings.push({
        type: 'performance',
        message: `Removing index "${oldIndex.name}" may slow down queries that use it`,
        severity: 'medium',
      });
    } else {
      // Check if index was modified
      const fieldsChanged = JSON.stringify(oldIndex.fields) !== JSON.stringify(newIndex.fields);
      const uniqueChanged = oldIndex.unique !== newIndex.unique;

      if (fieldsChanged || uniqueChanged) {
        modifiedIndexes.push({
          oldIndex,
          newIndex,
        });
        warnings.push({
          type: 'breaking_change',
          message: `Index "${oldIndex.name}" will be recreated with new configuration`,
          severity: 'medium',
        });
      }
    }
  });

  const hasChanges =
    finalAddedFields.length > 0 ||
    finalRemovedFields.length > 0 ||
    renamedFields.length > 0 ||
    modifiedFields.length > 0 ||
    addedIndexes.length > 0 ||
    removedIndexes.length > 0 ||
    modifiedIndexes.length > 0;

  return {
    hasChanges,
    addedFields: finalAddedFields,
    removedFields: finalRemovedFields,
    renamedFields,
    modifiedFields,
    addedIndexes,
    removedIndexes,
    modifiedIndexes,
    warnings,
  };
}

/**
 * Generate ALTER TABLE SQL statements from schema changes
 * Returns SQL migration statements to transform old schema to new schema
 */
export function generateAlterTableSQL(
  tableName: string,
  changes: SchemaChanges,
): string {
  if (!changes.hasChanges) {
    return '-- No schema changes detected';
  }

  const statements: string[] = [];

  // 1. Rename columns (must be done before other operations)
  changes.renamedFields.forEach((rename) => {
    const oldColumnName = toSnakeCase(rename.oldName);
    const newColumnName = toSnakeCase(rename.newName);
    statements.push(`ALTER TABLE ${tableName} RENAME COLUMN ${oldColumnName} TO ${newColumnName};`);
  });

  // 2. Add new columns
  changes.addedFields.forEach((field) => {
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
        const specialFunctions = ['NOW', 'CURRENT_DATE', 'CURRENT_TIMESTAMP', 'CURRENT_TIME'];
        const defaultValueUpper = field.defaultValue.toUpperCase();

        if (specialFunctions.includes(defaultValueUpper)) {
          const sqlFunction = defaultValueUpper === 'NOW' ? 'NOW()' : defaultValueUpper;
          constraints.push(`DEFAULT ${sqlFunction}`);
        } else {
          constraints.push(`DEFAULT '${field.defaultValue}'`);
        }
      } else if (typeof field.defaultValue === 'boolean') {
        constraints.push(`DEFAULT ${field.defaultValue}`);
      } else {
        constraints.push(`DEFAULT ${field.defaultValue}`);
      }
    }

    const constraintStr = constraints.length > 0 ? ` ${constraints.join(' ')}` : '';
    statements.push(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${dataType}${constraintStr};`);

    // Handle enum types - create type first if needed
    if (field.type === 'enum' && field.enumValues) {
      const enumTypeName = `${toSnakeCase(field.name)}_enum`;
      const values = field.enumValues.map((v) => `'${v}'`).join(', ');
      statements.unshift(`CREATE TYPE ${enumTypeName} AS ENUM (${values});`);
    }

    // Handle foreign key constraints
    if (field.type === 'relation' && field.relationConfig) {
      const targetTable = field.relationConfig.targetCollection;
      const onDelete = field.relationConfig.cascadeDelete ? 'CASCADE' : 'RESTRICT';
      const fkName = field.relationConfig.foreignKeyName || `fk_${tableName}_${columnName}`;
      statements.push(`ALTER TABLE ${tableName} ADD CONSTRAINT ${fkName} FOREIGN KEY (${columnName}) REFERENCES ${targetTable}(id) ON DELETE ${onDelete};`);
    }
  });

  // 3. Remove columns
  changes.removedFields.forEach((field) => {
    const columnName = toSnakeCase(field.name);
    statements.push(`ALTER TABLE ${tableName} DROP COLUMN ${columnName} CASCADE;`);

    // Drop enum type if it was used
    if (field.type === 'enum') {
      const enumTypeName = `${toSnakeCase(field.name)}_enum`;
      statements.push(`DROP TYPE IF EXISTS ${enumTypeName};`);
    }
  });

  // 4. Modify columns
  changes.modifiedFields.forEach((fieldChange) => {
    const columnName = toSnakeCase(fieldChange.newField.name);
    const { changes: changeTypes } = fieldChange;

    // Handle type changes
    if (changeTypes.includes('type')) {
      const newDataType = getPostgresType(fieldChange.newField);
      statements.push(`ALTER TABLE ${tableName} ALTER COLUMN ${columnName} TYPE ${newDataType} USING ${columnName}::${newDataType};`);
    }

    // Handle required constraint changes
    if (changeTypes.includes('required')) {
      if (fieldChange.newField.required) {
        statements.push(`ALTER TABLE ${tableName} ALTER COLUMN ${columnName} SET NOT NULL;`);
      } else {
        statements.push(`ALTER TABLE ${tableName} ALTER COLUMN ${columnName} DROP NOT NULL;`);
      }
    }

    // Handle unique constraint changes
    if (changeTypes.includes('unique')) {
      if (fieldChange.newField.unique) {
        const constraintName = `${tableName}_${columnName}_unique`;
        statements.push(`ALTER TABLE ${tableName} ADD CONSTRAINT ${constraintName} UNIQUE (${columnName});`);
      } else {
        const constraintName = `${tableName}_${columnName}_unique`;
        statements.push(`ALTER TABLE ${tableName} DROP CONSTRAINT IF EXISTS ${constraintName};`);
      }
    }

    // Handle default value changes
    if (changeTypes.includes('defaultValue')) {
      if (fieldChange.newField.defaultValue !== undefined) {
        let defaultValue = '';
        if (typeof fieldChange.newField.defaultValue === 'string') {
          const specialFunctions = ['NOW', 'CURRENT_DATE', 'CURRENT_TIMESTAMP', 'CURRENT_TIME'];
          const defaultValueUpper = fieldChange.newField.defaultValue.toUpperCase();

          if (specialFunctions.includes(defaultValueUpper)) {
            defaultValue = defaultValueUpper === 'NOW' ? 'NOW()' : defaultValueUpper;
          } else {
            defaultValue = `'${fieldChange.newField.defaultValue}'`;
          }
        } else {
          defaultValue = String(fieldChange.newField.defaultValue);
        }
        statements.push(`ALTER TABLE ${tableName} ALTER COLUMN ${columnName} SET DEFAULT ${defaultValue};`);
      } else {
        statements.push(`ALTER TABLE ${tableName} ALTER COLUMN ${columnName} DROP DEFAULT;`);
      }
    }
  });

  // 5. Remove indexes
  changes.removedIndexes.forEach((index) => {
    statements.push(`DROP INDEX IF EXISTS ${index.name};`);
  });

  // 6. Modify indexes (drop and recreate)
  changes.modifiedIndexes.forEach((indexChange) => {
    statements.push(`DROP INDEX IF EXISTS ${indexChange.oldIndex.name};`);

    const indexType = indexChange.newIndex.unique ? 'UNIQUE INDEX' : 'INDEX';
    const columns = indexChange.newIndex.fields.map(toSnakeCase).join(', ');
    statements.push(`CREATE ${indexType} ${indexChange.newIndex.name} ON ${tableName}(${columns});`);
  });

  // 7. Add new indexes
  changes.addedIndexes.forEach((index) => {
    const indexType = index.unique ? 'UNIQUE INDEX' : 'INDEX';
    const columns = index.fields.map(toSnakeCase).join(', ');
    statements.push(`CREATE ${indexType} ${index.name} ON ${tableName}(${columns});`);
  });

  return statements.join('\n');
}

/**
 * Update an existing Drizzle schema file for a collection
 * Overwrites the existing file with new schema code
 */
export async function updateDrizzleSchemaFile(
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

  // Create schema filename (e.g., test_products -> test-products.ts)
  const kebabName = collectionName.toLowerCase().replace(/_/g, '-');
  const schemaFilename = `${kebabName}.ts`;
  const schemaPath = path.join(customCollectionsDir, schemaFilename);

  // Check if file exists
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file for collection "${collectionName}" not found at ${schemaPath}`);
  }

  // Write the updated schema file with a header comment
  const schemaContent = `/**
 * ${collectionName} Collection Schema
 * Generated by Collection Builder
 * Last updated: ${new Date().toISOString()}
 *
 * This file is auto-generated. Manual modifications may be overwritten.
 */

${schemaCode}
`;

  fs.writeFileSync(schemaPath, schemaContent, 'utf-8');

  return schemaFilename;
}

/**
 * Update an existing test file for a collection
 * Overwrites the existing file with new test code
 */
export async function updateTestFile(
  collectionName: string,
  testCode: string,
): Promise<string> {
  // Skip file writing in test environment
  if (env.NODE_ENV === 'test') {
    return `test-file-${collectionName}.test.ts`;
  }

  // Get the test directory
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const testDir = path.join(__dirname, '../../../test/custom_collections');

  // Create test filename (e.g., test_products -> test-products.test.ts)
  const kebabName = collectionName.toLowerCase().replace(/_/g, '-');
  const testFilename = `${kebabName}.test.ts`;
  const testPath = path.join(testDir, testFilename);

  // Check if file exists
  if (!fs.existsSync(testPath)) {
    throw new Error(`Test file for collection "${collectionName}" not found at ${testPath}`);
  }

  // Write the updated test file
  fs.writeFileSync(testPath, testCode, 'utf-8');

  return testFilename;
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
  // Handle integer type
  if (field.type === 'integer') {
    return 'INTEGER';
  }

  // Handle decimal type with precision and scale
  if (field.type === 'decimal') {
    const precision = field.precision || 10;
    const scale = field.scale || field.decimalPlaces || 2;
    return `NUMERIC(${precision}, ${scale})`;
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
      case 'integer':
        usedTypes.add('integer');
        break;
      case 'decimal':
        usedTypes.add('numeric');
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
      case 'integer':
        drizzleType = `integer('${columnName}')`;
        break;
      case 'decimal':
        // Handle decimals with precision and scale
        const precision = field.precision || 10;
        const scale = field.scale || field.decimalPlaces || 2;
        drizzleType = `numeric('${columnName}', { precision: ${precision}, scale: ${scale} })`;
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
 * Enhanced to handle schema migrations, file updates, and test regeneration
 */
export async function updateCollectionDefinition(
  id: number,
  updates: Partial<CollectionDefinitionInput>,
  _userId: number,
): Promise<{
  collection: typeof collectionDefinitions.$inferSelect;
  schemaChanges?: SchemaChanges;
  migrationFile?: string;
}> {
  // Get existing definition
  const existing = await getCollectionDefinitionById(id);
  if (!existing) {
    throw new Error(`Collection definition with ID ${id} not found`);
  }

  // Prevent updating system collections
  if (existing.isSystem) {
    throw new Error('Cannot update system collections');
  }

  // Create old definition for comparison
  const oldDefinition: CollectionDefinitionInput = {
    name: existing.name,
    apiName: existing.apiName,
    displayName: existing.displayName,
    description: existing.description ?? undefined,
    icon: existing.icon ?? undefined,
    fields: existing.fields as unknown as CollectionField[],
    indexes: existing.indexes as unknown as CollectionIndex[],
    relationships: existing.relationships as unknown as CollectionRelationship[],
  };

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

  // Compare schemas to detect changes
  const schemaChanges = compareCollectionSchemas(oldDefinition, mergedDefinition);

  // If there are schema changes (field or index changes), generate migration
  let migrationFile: string | undefined;
  if (schemaChanges.hasChanges) {
    // Generate ALTER TABLE SQL
    const alterTableSQL = generateAlterTableSQL(existing.name, schemaChanges);

    // Write migration file
    const timestamp = Date.now();
    const migrationName = `${String(timestamp).slice(-8)}_update_${existing.name}_table`;
    migrationFile = await writeMigrationFile(migrationName, alterTableSQL);

    // Generate and update Drizzle schema
    const schemaCode = generateDrizzleSchema(mergedDefinition);
    await updateDrizzleSchemaFile(existing.name, schemaCode);

    // Generate and update test file
    const testCode = generateBasicTests(mergedDefinition);
    await updateTestFile(existing.name, testCode);
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

  return {
    collection: updated,
    schemaChanges: schemaChanges.hasChanges ? schemaChanges : undefined,
    migrationFile,
  };
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
 * Update the custom collections index.ts to export the new schema
 */
export async function updateCustomCollectionsIndex(collectionName: string): Promise<void> {
  if (env.NODE_ENV === 'test') {
    return;
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const indexPath = path.join(__dirname, '../../db/schema/custom_collections/index.ts');
  const kebabName = collectionName.toLowerCase().replace(/_/g, '-');

  // Read existing index file
  let indexContent = '';
  try {
    indexContent = fs.readFileSync(indexPath, 'utf-8');
  } catch {
    // If index file doesn't exist, create it with a header
    indexContent = `/**
 * Custom Collections - Auto-generated exports
 * This file is automatically updated when new collections are created.
 */\n\n`;
  }

  // Check if export already exists
  const exportStatement = `export * from './${kebabName}';`;
  if (indexContent.includes(exportStatement)) {
    return; // Already exported
  }

  // Find the last export statement or add after header
  const lines = indexContent.split('\n');
  let insertIndex = -1;

  // Find the last export line
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i]?.trim().startsWith('export ')) {
      insertIndex = i + 1;
      break;
    }
  }

  // If no exports found, insert after header comments
  if (insertIndex === -1) {
    for (let i = 0; i < lines.length; i++) {
      if (
        !lines[i]?.trim().startsWith('*') &&
        !lines[i]?.trim().startsWith('//') &&
        !lines[i]?.trim().startsWith('/*') &&
        lines[i]?.trim() !== ''
      ) {
        insertIndex = i;
        break;
      }
    }
  }

  // If still not found, append at end
  if (insertIndex === -1) {
    insertIndex = lines.length;
  }

  // Insert the new export
  lines.splice(insertIndex, 0, exportStatement);

  // Write back
  fs.writeFileSync(indexPath, lines.join('\n'), 'utf-8');
}

/**
 * Generate basic Vitest tests for a new collection
 */
export function generateBasicTests(definition: CollectionDefinitionInput): string {
  const tableName = definition.name;
  const schemaName = tableName.replace(/_/g, '');
  const kebabName = tableName.replace(/_/g, '-');

  // Build sample data for creating a record
  // Helper type for code markers
  type CodeMarker = { __code: string };
  const sampleData: Record<string, unknown | CodeMarker> = {};
  definition.fields.forEach((field) => {
    if (field.type === 'text' || field.type === 'longtext' || field.type === 'richtext') {
      sampleData[field.name] = `Sample ${field.name}`;
    } else if (field.type === 'integer') {
      sampleData[field.name] = 42;
    } else if (field.type === 'decimal') {
      sampleData[field.name] = 99.99;
    } else if (field.type === 'boolean') {
      sampleData[field.name] = true;
    } else if (field.type === 'date' || field.type === 'datetime') {
      sampleData[field.name] = { __code: 'new Date()' }; // Mark as code to be rendered directly
    } else if (field.type === 'json') {
      sampleData[field.name] = { __code: "{ key: 'value' }" }; // Mark as code
    } else if (field.type === 'enum' && field.enumValues && field.enumValues.length > 0) {
      sampleData[field.name] = field.enumValues[0]; // Use actual value, not quoted
    } else {
      sampleData[field.name] = 'sample_value';
    }
  });

  // Convert sample data to test code
  const sampleDataLines = Object.entries(sampleData)
    .map(([key, value]) => {
      // Check if value is a code marker object
      if (typeof value === 'object' && value !== null && '__code' in value) {
        return `      ${key}: ${(value as CodeMarker).__code},`;
      }
      // Otherwise, stringify the value
      return `      ${key}: ${JSON.stringify(value)},`;
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
  lines.push(`    expect(newRecord!.id).toBeGreaterThan(0);`);
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
  lines.push(`    expect(created).toBeDefined();`);
  lines.push('');
  lines.push(`    // Read all records`);
  lines.push(`    const records = await db.select().from(${schemaName}).execute();`);
  lines.push('');
  lines.push(`    expect(records).toHaveLength(1);`);
  lines.push(`    expect(records[0]!.id).toBe(created!.id);`);
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
  lines.push(`    expect(created).toBeDefined();`);
  lines.push('');
  lines.push(`    // Update the record`);
  lines.push(`    const [updated] = await db`);
  lines.push(`      .update(${schemaName})`);
  // Generate the update value - handle code markers for dates/json, use null-safe access
  const firstField = definition.fields[0];
  const updateFieldName = firstField?.name || 'id';
  let updateValue = "'Updated value'";
  if (firstField) {
    const fieldData = sampleData[firstField.name];
    if (typeof fieldData === 'object' && fieldData !== null && '__code' in fieldData) {
      updateValue = (fieldData as CodeMarker).__code;
    }
  }
  lines.push(`      .set({ ${updateFieldName}: ${updateValue} })`);
  lines.push(`      .where(eq(${schemaName}.id, created!.id))`);
  lines.push(`      .returning();`);
  lines.push('');
  lines.push(`    expect(updated).toBeDefined();`);
  lines.push(`    expect(updated!.id).toBe(created!.id);`);
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
  lines.push(`    expect(created).toBeDefined();`);
  lines.push('');
  lines.push(`    // Delete the record`);
  lines.push(`    await db.delete(${schemaName}).where(eq(${schemaName}.id, created!.id)).execute();`);
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
  const testDir = path.join(__dirname, '../../../test/custom_collections');

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

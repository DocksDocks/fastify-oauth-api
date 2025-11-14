/**
 * Collections Configuration - Auto-Generated from Drizzle Schemas
 *
 * Automatically generates collection configurations from database schema files.
 * Also loads custom collections created via the Collection Builder.
 * No manual maintenance needed - always in sync with the database.
 */

import { getTableColumns } from 'drizzle-orm';
import type { PgTable, PgColumn } from 'drizzle-orm/pg-core';
import * as schema from '@/db/schema';
import {
  getAllCollectionDefinitions,
  type CollectionField,
  type FieldType,
} from '@/builder/services/collection-builder.service';

export interface CollectionColumn {
  name: string; // JavaScript property name (for frontend row access)
  dbColumnName: string; // Database column name (for SQL queries)
  label: string;
  type: 'text' | 'number' | 'date' | 'timestamp' | 'boolean' | 'enum' | 'json';
  sortable?: boolean;
  searchable?: boolean;
  enumValues?: string[]; // Available values for enum fields
  readonly?: boolean; // Prevent editing this field
  foreignKey?: {
    table: string; // Referenced table name
    displayField: string; // Field to display (e.g., 'provider', 'email')
    labelField?: string; // Optional secondary field for display (e.g., 'name')
  };
}

export interface Collection {
  name: string; // Display name
  table: string; // Database table name
  description?: string;
  columns: CollectionColumn[];
  defaultSort?: { column: string; order: 'asc' | 'desc' };
  defaultLimit?: number;
  requiredRole?: 'admin' | 'superadmin'; // Minimum role required to access this collection
  isCustom?: boolean; // True if this is a custom collection created via Collection Builder
}

/**
 * Internal interface for column with priority (used for sorting)
 */
interface CollectionColumnWithPriority extends CollectionColumn {
  _priority: number;
}

/**
 * Tables to exclude from collections (internal system tables)
 */
const EXCLUDED_TABLES = new Set([
  'seed_status',
  'setup_status',
  'refresh_tokens',
  'api_keys',
  'collection_preferences',
  'collection_definitions',
  'collection_migrations',
]);

/**
 * Foreign key relationships configuration
 * Maps table.column to the referenced table and display field
 */
const FOREIGN_KEY_RELATIONSHIPS: Record<string, { table: string; displayField: string; labelField?: string }> = {
  'users.primaryProviderAccountId': {
    table: 'provider_accounts',
    displayField: 'provider',
    labelField: 'email',
  },
  'provider_accounts.userId': {
    table: 'users',
    displayField: 'email',
    labelField: 'name',
  },
  'authorized_admins.createdBy': {
    table: 'users',
    displayField: 'email',
    labelField: 'name',
  },
  'collection_preferences.updatedBy': {
    table: 'users',
    displayField: 'email',
    labelField: 'name',
  },
};

/**
 * Column name patterns that should not be searchable
 */
const NON_SEARCHABLE_PATTERNS = [
  /^id$/i,
  /_id$/i, // Foreign keys
  /^created_at$/i,
  /^updated_at$/i,
  /^deleted_at$/i,
];

/**
 * Convert snake_case to Title Case
 */
function toTitleCase(str: string): string {
  return str
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Convert snake_case to camelCase
 */
function toCamelCase(str: string): string {
  return str
    .split('_')
    .map((word, index) => {
      if (index === 0) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
}

/**
 * Determine if a column should be searchable
 */
function isSearchable(columnName: string, columnType: string): boolean {
  // Only text columns are searchable
  if (columnType !== 'text') {
    return false;
  }

  // Check against non-searchable patterns
  return !NON_SEARCHABLE_PATTERNS.some((pattern) => pattern.test(columnName));
}

/**
 * Determine if a column is readonly (cannot be edited)
 */
function isReadonly(columnName: string, tableName: string): boolean {
  // Base readonly fields (apply to all tables)
  const baseReadonlyFields = ['id', 'created_at', 'updated_at', 'last_login_at', 'linked_at'];

  // Users table specific readonly fields (authentication-related)
  const usersReadonlyFields = ['email', 'primary_provider_account_id'];

  if (baseReadonlyFields.some((field) => columnName.toLowerCase() === field)) {
    return true;
  }

  if (tableName === 'users' && usersReadonlyFields.some((field) => columnName.toLowerCase() === field)) {
    return true;
  }

  return false;
}

/**
 * Determine if a column should be sortable
 */
function isSortable(): boolean {
  // All columns are sortable except very long text fields
  // (we don't have a way to detect length from Drizzle metadata easily)
  return true;
}

/**
 * Map Drizzle column type to collection column type
 */
function mapColumnType(column: PgColumn): CollectionColumn['type'] {
  const columnType = column.columnType.toLowerCase();

  // Serial and integers
  if (
    columnType.includes('serial') ||
    columnType.includes('integer') ||
    columnType.includes('int') ||
    columnType.includes('smallint') ||
    columnType.includes('bigint')
  ) {
    return 'number';
  }

  // Text types
  if (
    columnType.includes('varchar') ||
    columnType.includes('text') ||
    columnType.includes('char')
  ) {
    return 'text';
  }

  // Timestamp (includes both with and without timezone)
  if (columnType.includes('timestamp')) {
    return 'timestamp';
  }

  // Date only (without time)
  if (columnType.includes('date')) {
    return 'date';
  }

  // Boolean
  if (columnType.includes('boolean') || columnType.includes('bool')) {
    return 'boolean';
  }

  // Enum (Drizzle uses special enum types)
  if (column.enumValues && column.enumValues.length > 0) {
    return 'enum';
  }

  // Numeric types (decimal, real, double precision)
  if (
    columnType.includes('decimal') ||
    columnType.includes('numeric') ||
    columnType.includes('real') ||
    columnType.includes('double')
  ) {
    return 'number';
  }

  // JSON types
  /* v8 ignore next 3 - Unreachable: No JSON/JSONB columns in current schema */
  if (columnType.includes('json')) {
    return 'json';
  }

  // Default to text
  return 'text';
}

/**
 * Get column priority for smart ordering
 * Lower number = higher priority (appears first)
 */
function getColumnPriority(columnName: string): number {
  // ID column always first
  if (columnName === 'id') return 0;

  // Name, title, email - important identifying fields
  if (['name', 'title', 'email', 'code'].includes(columnName)) return 1;

  // Status, role, permission - important state fields
  if (['status', 'role', 'permission', 'is_public', 'is_coach'].includes(columnName)) return 2;

  // Foreign keys and references
  if (columnName.endsWith('_id') || columnName.startsWith('shared_')) return 3;

  // Timestamps - always last
  /* v8 ignore next 7 - Unreachable: Drizzle uses camelCase (createdAt) not snake_case (created_at) */
  if (
    ['created_at', 'updated_at', 'deleted_at', 'revoked_at', 'performed_at', 'invited_at', 'responded_at', 'removed_at', 'read_at', 'last_login_at'].includes(
      columnName
    )
  ) {
    return 5;
  }

  // Everything else in the middle
  return 4;
}

/**
 * Generate collection configuration from a Drizzle table schema
 */
function generateCollection(table: PgTable, tableName: string): Collection {
  const columns = getTableColumns(table);
  const columnEntries = Object.entries(columns);

  // Generate column configurations
  const collectionColumns: CollectionColumn[] = columnEntries
    .map(([columnName, column]) => {
      const pgColumn = column as PgColumn;
      const type = mapColumnType(pgColumn);
      const dbColName = pgColumn.name; // Database column name (snake_case)

      const columnConfig: CollectionColumnWithPriority = {
        name: columnName, // JavaScript property name (camelCase - matches Drizzle ORM output)
        dbColumnName: dbColName, // Database column name (snake_case - for SQL queries)
        label: toTitleCase(dbColName), // Better formatting: "Created At" instead of "Createdat"
        type,
        sortable: isSortable(),
        searchable: isSearchable(dbColName, type),
        readonly: isReadonly(dbColName, tableName),
        _priority: getColumnPriority(dbColName), // Temporary field for sorting
      };

      // Add foreign key relationship if exists
      const fkKey = `${tableName}.${columnName}`;
      if (FOREIGN_KEY_RELATIONSHIPS[fkKey]) {
        columnConfig.foreignKey = FOREIGN_KEY_RELATIONSHIPS[fkKey];
      }

      // Add enum values if this is an enum column
      if (type === 'enum' && pgColumn.enumValues && pgColumn.enumValues.length > 0) {
        columnConfig.enumValues = [...pgColumn.enumValues];
      }

      return columnConfig;
    })
    // Sort by priority
    .sort((a, b) => a._priority - b._priority)
    // Remove priority field
    .map(({ _priority, ...col }) => col);

  // Determine default sort column (using JavaScript property names)
  const performedAtCol = collectionColumns.find((col) => col.name === 'performedAt');
  const createdAtCol = collectionColumns.find((col) => col.name === 'createdAt');
  const nameCol = collectionColumns.find((col) => col.name === 'name');

  let defaultSortColumn = 'id';
  let defaultSortOrder: 'asc' | 'desc' = 'desc';

  if (performedAtCol) {
    defaultSortColumn = performedAtCol.name;
    defaultSortOrder = 'desc';
  } else if (createdAtCol) {
    defaultSortColumn = createdAtCol.name;
    defaultSortOrder = 'desc';
  } /* v8 ignore next 3 - Unreachable: All tables have createdAt timestamp */ else if (nameCol) {
    defaultSortColumn = 'name';
    defaultSortOrder = 'asc';
  }

  return {
    name: toTitleCase(tableName),
    table: tableName,
    columns: collectionColumns,
    defaultSort: {
      column: defaultSortColumn,
      order: defaultSortOrder,
    },
    defaultLimit: 20,
  };
}

/**
 * Type guard to check if a value is a Drizzle table
 */
function isDrizzleTable(value: unknown): value is PgTable {
  return (
    value !== null &&
    typeof value === 'object' &&
    'getSQL' in value &&
    typeof (value as Record<string, unknown>).getSQL === 'function'
  );
}

/**
 * Get all table exports from schema
 */
function getSchemaTableMap(): Record<string, PgTable> {
  const tableMap: Record<string, PgTable> = {};

  for (const [exportName, exportValue] of Object.entries(schema)) {
    // Skip non-table exports (enums, types, etc.)
    if (!exportValue || typeof exportValue !== 'object') continue;

    // Check if it's a Drizzle table using type guard
    if (isDrizzleTable(exportValue)) {
      // Get table name from the table config (Drizzle internal symbol)
      const drizzleNameSymbol = Symbol.for('drizzle:Name');
      const tableName = (exportValue as unknown as Record<symbol, unknown>)[drizzleNameSymbol] as string || exportName;

      // Skip excluded tables
      if (!EXCLUDED_TABLES.has(tableName)) {
        tableMap[tableName] = exportValue;
      }
    }
  }

  return tableMap;
}

/**
 * Tables that require superadmin role to access
 */
const SUPERADMIN_ONLY_TABLES = new Set(['authorized_admins']);

// ============================================================================
// Custom Collection Loading (from Collection Builder)
// ============================================================================

/**
 * Map Collection Builder field types to collection column types
 */
function mapFieldTypeToColumnType(
  fieldType: FieldType,
): 'text' | 'number' | 'date' | 'timestamp' | 'boolean' | 'enum' | 'json' {
  const typeMap: Record<FieldType, CollectionColumn['type']> = {
    text: 'text',
    longtext: 'text',
    richtext: 'text',
    integer: 'number',
    decimal: 'number',
    date: 'date',
    datetime: 'timestamp',
    boolean: 'boolean',
    enum: 'enum',
    json: 'json',
    relation: 'number', // Foreign key IDs are numbers
    media: 'text', // File URLs are text
  };

  return typeMap[fieldType];
}

/**
 * Convert CollectionField to CollectionColumn
 */
function fieldToCollectionColumn(field: CollectionField): CollectionColumn {
  const columnType = mapFieldTypeToColumnType(field.type);

  const column: CollectionColumn = {
    name: toCamelCase(field.name), // Convert snake_case to camelCase for JS property
    dbColumnName: field.name, // Keep original snake_case for SQL
    label: toTitleCase(field.name), // Auto-generate label from field name
    type: columnType,
    sortable: true,
    searchable: field.type === 'text' || field.type === 'longtext', // Only text fields searchable
    readonly: false,
  };

  // Add enum values if this is an enum field
  if (field.type === 'enum' && field.enumValues && field.enumValues.length > 0) {
    column.enumValues = field.enumValues;
  }

  // Add foreign key info if this is a relation field
  if (field.type === 'relation' && field.relationConfig) {
    column.foreignKey = {
      table: field.relationConfig.targetCollection,
      displayField: 'id', // Default to id - can be enhanced later
    };
  }

  return column;
}

/**
 * Load custom collections from database (created via Collection Builder)
 */
async function loadCustomCollections(): Promise<Collection[]> {
  try {
    const definitions = await getAllCollectionDefinitions();

    return definitions.map((def) => {
      // Convert fields to columns
      const fields = def.fields as unknown as CollectionField[];
      const columns: CollectionColumn[] = fields.map((field) => fieldToCollectionColumn(field));

      // Add standard system columns (id, created_at, updated_at)
      const systemColumns: CollectionColumn[] = [
        {
          name: 'id',
          dbColumnName: 'id',
          label: 'ID',
          type: 'number',
          sortable: true,
          searchable: false,
          readonly: true,
        },
        {
          name: 'createdAt',
          dbColumnName: 'created_at',
          label: 'Created',
          type: 'timestamp',
          sortable: true,
          searchable: false,
          readonly: true,
        },
        {
          name: 'updatedAt',
          dbColumnName: 'updated_at',
          label: 'Updated',
          type: 'timestamp',
          sortable: true,
          searchable: false,
          readonly: true,
        },
      ];

      // Combine system columns + custom fields
      const allColumns = [...systemColumns, ...columns];

      // Create collection config
      const collection: Collection = {
        name: def.displayName,
        table: def.name, // Use internal name as table name
        description: def.description ?? undefined,
        columns: allColumns,
        defaultSort: {
          column: 'createdAt', // Default to created_at for custom collections
          order: 'desc',
        },
        defaultLimit: 20,
        requiredRole: 'superadmin', // Custom collections require superadmin access by default
        isCustom: true, // Mark as custom collection
      };

      return collection;
    });
  } catch (error) {
    // If database is not ready or there's an error, return empty array
    // This allows the app to start even if collection_definitions table doesn't exist yet
    console.error('Failed to load custom collections:', error);
    return [];
  }
}

/**
 * Generate all collections from schema
 */
function generateCollections(): Collection[] {
  const tableMap = getSchemaTableMap();
  const collectionsList: Collection[] = [];

  for (const [tableName, table] of Object.entries(tableMap)) {
    const collection = generateCollection(table, tableName);

    // Set required role for sensitive tables
    if (SUPERADMIN_ONLY_TABLES.has(tableName)) {
      collection.requiredRole = 'superadmin';
    }

    collectionsList.push(collection);
  }

  // Sort collections alphabetically by display name
  return collectionsList.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Available collections for admin panel (auto-generated)
 */
export const collections: Collection[] = generateCollections();

/**
 * Get collection configuration by table name
 */
export function getCollectionByTable(table: string): Collection | undefined {
  return collections.find((c) => c.table === table);
}

/**
 * Get list of all available collection names
 */
export function getAvailableCollections(): { name: string; table: string; description?: string; requiredRole?: 'admin' | 'superadmin' }[] {
  return collections.map((c) => ({
    name: c.name,
    table: c.table,
    description: c.description,
    requiredRole: c.requiredRole,
  }));
}

/**
 * Get table map for dynamic queries
 */
export function getTableMap(): Record<string, PgTable> {
  return getSchemaTableMap();
}

// ============================================================================
// Async Collection Loading (System + Custom)
// ============================================================================

/**
 * Get all collections (system + custom) - Async version
 * This merges auto-generated collections from schema with custom collections
 * created via the Collection Builder.
 *
 * Use this function when you need the complete list of all collections.
 */
export async function getAllCollections(): Promise<Collection[]> {
  const systemCollections = collections; // Already generated sync collections
  const customCollections = await loadCustomCollections();

  // Merge both lists and sort alphabetically
  const allCollections = [...systemCollections, ...customCollections];
  return allCollections.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get collection by table name (async version that includes custom collections)
 */
export async function getCollectionByTableAsync(table: string): Promise<Collection | undefined> {
  const allCollections = await getAllCollections();
  return allCollections.find((c) => c.table === table);
}

/**
 * Get list of all available collection names (async version that includes custom collections)
 */
export async function getAvailableCollectionsAsync(): Promise<
  { name: string; table: string; description?: string; requiredRole?: 'admin' | 'superadmin' }[]
> {
  const allCollections = await getAllCollections();
  return allCollections.map((c) => ({
    name: c.name,
    table: c.table,
    description: c.description,
    requiredRole: c.requiredRole,
  }));
}

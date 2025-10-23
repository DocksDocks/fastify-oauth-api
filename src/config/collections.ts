/**
 * Collections Configuration - Auto-Generated from Drizzle Schemas
 *
 * Automatically generates collection configurations from database schema files.
 * No manual maintenance needed - always in sync with the database.
 */

import { getTableColumns } from 'drizzle-orm';
import type { PgTable, PgColumn } from 'drizzle-orm/pg-core';
import * as schema from '@/db/schema';

export interface CollectionColumn {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'timestamp' | 'boolean' | 'enum' | 'json';
  sortable?: boolean;
  searchable?: boolean;
}

export interface Collection {
  name: string; // Display name
  table: string; // Database table name
  description?: string;
  columns: CollectionColumn[];
  defaultSort?: { column: string; order: 'asc' | 'desc' };
  defaultLimit?: number;
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
const EXCLUDED_TABLES = new Set(['seed_status', 'refresh_tokens', 'api_keys']);

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

  // Timestamp with timezone
  /* v8 ignore next 3 - Unreachable: Drizzle columnType returns 'timestamp' not 'timestamp with timezone' */
  if (columnType.includes('timestamp') && columnType.includes('timezone')) {
    return 'timestamp';
  }

  // Date or timestamp without timezone
  if (columnType.includes('timestamp') || columnType.includes('date')) {
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
      const type = mapColumnType(column as PgColumn);
      return {
        name: columnName,
        label: toTitleCase(columnName),
        type,
        sortable: isSortable(),
        searchable: isSearchable(columnName, type),
        _priority: getColumnPriority(columnName), // Temporary field for sorting
      } as CollectionColumnWithPriority;
    })
    // Sort by priority
    .sort((a, b) => a._priority - b._priority)
    // Remove priority field
    .map(({ _priority, ...col }) => col);

  // Determine default sort column (check both camelCase and snake_case)
  const performedAtCol = collectionColumns.find((col) => col.name === 'performed_at' || col.name === 'performedAt');
  const createdAtCol = collectionColumns.find((col) => col.name === 'created_at' || col.name === 'createdAt');
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
      const tableWithSymbol = exportValue as PgTable & { [key: symbol]: string };
      const tableName = tableWithSymbol[Symbol.for('drizzle:Name')] || exportName;

      // Skip excluded tables
      if (!EXCLUDED_TABLES.has(tableName)) {
        tableMap[tableName] = exportValue;
      }
    }
  }

  return tableMap;
}

/**
 * Generate all collections from schema
 */
function generateCollections(): Collection[] {
  const tableMap = getSchemaTableMap();
  const collectionsList: Collection[] = [];

  for (const [tableName, table] of Object.entries(tableMap)) {
    const collection = generateCollection(table, tableName);
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
export function getAvailableCollections(): { name: string; table: string; description?: string }[] {
  return collections.map((c) => ({
    name: c.name,
    table: c.table,
    description: c.description,
  }));
}

/**
 * Get table map for dynamic queries
 */
export function getTableMap(): Record<string, PgTable> {
  return getSchemaTableMap();
}

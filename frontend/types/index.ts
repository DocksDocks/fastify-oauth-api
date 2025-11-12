/**
 * TypeScript types for API responses and data models
 */

import type { AxiosError } from 'axios';

/**
 * Backend error response structure (from src/utils/response.ts)
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

/**
 * Typed Axios error for API calls
 */
export type ApiError = AxiosError<ApiErrorResponse>;

export interface User {
  id: number;
  email: string;
  name: string | null;
  avatar: string | null;
  role: 'user' | 'admin' | 'superadmin';
  provider: string;
  providerId?: string;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt: string | null;
}

export interface ApiKey {
  id: number;
  name: string;
  status: 'active' | 'revoked';
  createdAt: string;
  updatedAt: string;
  revokedAt: string | null;
  createdBy: number;
}

export interface ApiKeyWithPlainKey extends ApiKey {
  plainKey: string;
}

export interface Collection {
  name: string;
  table: string;
  description?: string;
  requiredRole?: 'admin' | 'superadmin';
}

export interface CollectionColumn {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'timestamp' | 'boolean' | 'enum' | 'json';
  sortable?: boolean;
  searchable?: boolean;
  enumValues?: string[];
  readonly?: boolean; // Prevent editing this field
}

export interface CollectionMeta extends Collection {
  columns: CollectionColumn[];
  defaultSort?: { column: string; order: 'asc' | 'desc' };
  defaultLimit?: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string | { code: string; message: string };
  message?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthorizedAdmin {
  id: number;
  email: string;
  createdAt: string;
  createdBy: number;
  createdByEmail: string | null;
  createdByName: string | null;
}

// ============================================================================
// Collection Builder Types
// ============================================================================

export interface CollectionDefinition {
  id: number;
  name: string; // Internal name (lowercase, underscored)
  apiName: string; // API endpoint name (e.g., "blog_posts")
  displayName: string; // Human-readable name (e.g., "Blog Posts")
  description?: string;
  icon?: string; // Lucide icon name
  fields: CollectionField[];
  indexes?: CollectionIndex[];
  relationships?: CollectionRelationship[];
  isSystem: boolean; // System collections can't be deleted
  createdBy: number; // User ID
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export type FieldType =
  | 'text' // varchar(255)
  | 'longtext' // text
  | 'richtext' // text (HTML)
  | 'number' // integer or numeric
  | 'date' // date
  | 'datetime' // timestamp
  | 'boolean' // boolean
  | 'enum' // enum type
  | 'json' // jsonb
  | 'relation' // foreign key
  | 'media'; // text (file URL)

export interface CollectionField {
  name: string; // Field name (camelCase in code, snake_case in DB)
  type: FieldType;
  label: string; // Display label
  description?: string;
  required?: boolean;
  unique?: boolean;
  defaultValue?: unknown;
  validation?: FieldValidation;

  // For number type
  numberType?: 'integer' | 'decimal';
  decimalPlaces?: number;

  // For enum type
  enumValues?: string[];

  // For relation type
  relationConfig?: RelationConfig;
}

export interface FieldValidation {
  min?: number; // Min length (text) or min value (number)
  max?: number; // Max length (text) or max value (number)
  regex?: string; // Validation regex
  errorMessage?: string; // Custom error message
}

export interface RelationConfig {
  targetCollection: string; // Table name of related collection
  relationType: 'one-to-one' | 'one-to-many' | 'many-to-many';
  cascadeDelete?: boolean; // Delete related records on parent delete
  foreignKeyName?: string; // Custom FK column name
}

export interface CollectionIndex {
  name: string; // Index name
  fields: string[]; // Fields to index
  unique: boolean; // Unique constraint?
}

export interface CollectionRelationship {
  fieldName: string; // Field that holds the relation
  targetCollection: string; // Related collection name
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

// Migration preview/application
export interface MigrationPreview {
  sql: string; // Generated SQL
  affectedTables: string[];
  warnings: string[]; // Potential issues
}

export interface MigrationResult {
  success: boolean;
  message: string;
  error?: string;
}

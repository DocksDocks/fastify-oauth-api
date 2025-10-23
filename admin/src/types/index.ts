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
  role: 'user' | 'coach' | 'admin' | 'superadmin';
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
}

export interface CollectionColumn {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'timestamp' | 'boolean' | 'enum' | 'json';
  sortable?: boolean;
  searchable?: boolean;
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

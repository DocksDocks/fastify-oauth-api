'use client';

/**
 * API Client (Next.js)
 *
 * Axios instance with interceptors for:
 * - API key injection
 * - JWT token injection
 * - Token refresh on 401
 * - Error handling
 */

import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

// API base URL
// Use NEXT_PUBLIC_API_URL from env if available, otherwise fallback to smart detection
const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL;
const isClient = typeof window !== 'undefined';
const isLocalhost = isClient &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Priority: NEXT_PUBLIC_API_URL > relative /api (prod/ngrok) > localhost:1337 (local dev)
const BASE_URL = NEXT_PUBLIC_API_URL
  ? `${NEXT_PUBLIC_API_URL}/api`
  : process.env.NODE_ENV === 'production' || !isLocalhost
    ? '/api'
    : 'http://localhost:1337/api';

// API key (from env or localStorage - only access localStorage if in browser)
const API_KEY = process.env.NEXT_PUBLIC_ADMIN_PANEL_API_KEY ||
  (isClient ? localStorage.getItem('api_key') : '') || '';

// Create axios instance
export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add API key and JWT token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add API key header (required for all routes except whitelisted)
    if (API_KEY) {
      config.headers['X-API-Key'] = API_KEY;
    }

    // Add JWT token if available (only in browser)
    if (isClient) {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Token refresh lock to prevent concurrent refresh attempts (race condition fix)
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

// Response interceptor: Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // If already refreshing, wait for that refresh to complete
      if (isRefreshing && refreshPromise) {
        try {
          const newAccessToken = await refreshPromise;
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch {
          // Refresh failed, let it redirect to login
          return Promise.reject(error);
        }
      }

      // Start new refresh
      isRefreshing = true;
      refreshPromise = (async () => {
        try {
          // Only access localStorage if in browser
          if (!isClient) {
            throw new Error('Cannot access localStorage in SSR');
          }

          const refreshToken = localStorage.getItem('refresh_token');

          if (!refreshToken) {
            throw new Error('No refresh token');
          }

          // Try to refresh access token
          const response = await axios.post(`${BASE_URL}/auth/refresh`, {
            refreshToken,
          }, {
            headers: {
              'X-API-Key': API_KEY,
            },
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data.data;

          // Store new tokens in localStorage
          localStorage.setItem('access_token', accessToken);
          localStorage.setItem('refresh_token', newRefreshToken);

          // Update Zustand store with new tokens
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            const authStorage = {
              state: {
                user,
                accessToken,
                refreshToken: newRefreshToken,
                isAuthenticated: true,
              },
              version: 0,
            };
            localStorage.setItem('auth-storage', JSON.stringify(authStorage));
          }

          return accessToken;
        } catch (refreshError) {
          // Refresh failed, clear tokens and redirect to login
          if (isClient) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            localStorage.removeItem('auth-storage');

            // Only redirect if not already on login page (prevent infinite loop)
            if (window.location.pathname !== '/admin/login') {
              window.location.href = '/admin/login';
            }
          }
          throw refreshError;
        } finally {
          // Reset lock after refresh completes (success or failure)
          isRefreshing = false;
          refreshPromise = null;
        }
      })();

      try {
        const newAccessToken = await refreshPromise;
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch {
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// Helper function to handle API errors
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.error?.message || error.response?.data?.error || error.message;
    return typeof message === 'string' ? message : 'An error occurred';
  }
  return error instanceof Error ? error.message : 'An unknown error occurred';
}

// API endpoints
export const authApi = {
  // Admin panel OAuth (existing admins only, no user creation)
  adminGoogle: () => api.get('/auth/admin/google'),
  adminApple: () => api.get('/auth/admin/apple'),

  // Regular user OAuth (mobile app, creates new users)
  google: () => api.get('/auth/google'),
  apple: () => api.get('/auth/apple'),

  // Token management
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  verify: () => api.get('/auth/verify'),
  logout: () => api.post('/auth/logout'),
};

export const adminApi = {
  // User stats
  getUserStats: () => api.get('/admin/users/stats'),

  // API Keys
  getApiKeys: () => api.get('/admin/api-keys'),
  getApiKeyStats: () => api.get('/admin/api-keys/stats'),
  generateApiKey: (name: string) => api.post('/admin/api-keys/generate', { name }),
  regenerateApiKey: (id: number) => api.post(`/admin/api-keys/${id}/regenerate`),
  revokeApiKey: (id: number) => api.post(`/admin/api-keys/${id}/revoke`),

  // Collections
  getCollections: () => api.get('/admin/collections'),
  getCollectionMeta: (table: string) => api.get(`/admin/collections/${table}/meta`),
  getCollectionData: (
    table: string,
    page?: number,
    limit?: number,
    search?: string,
    sortBy?: string,
    sortOrder?: string
  ) => api.get(`/admin/collections/${table}/data`, {
    params: { page, limit, search, sortBy, sortOrder },
  }),

  // Authorized Admins (superadmin only)
  getAuthorizedAdmins: () => api.get('/admin/authorized-admins'),
  addAuthorizedAdmin: (email: string) => api.post('/admin/authorized-admins', { email }),
  removeAuthorizedAdmin: (id: number) => api.delete(`/admin/authorized-admins/${id}`),
};

export default api;

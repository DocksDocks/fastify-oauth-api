/**
 * API Client
 *
 * Axios instance with interceptors for:
 * - API key injection
 * - JWT token injection
 * - Token refresh on 401
 * - Error handling
 */

import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

// API base URL (Vite proxy handles /api in dev, production uses same origin)
const BASE_URL = import.meta.env.PROD ? '/api' : 'http://localhost:1337/api';

// API key (from env or localStorage)
const API_KEY = import.meta.env.VITE_ADMIN_PANEL_API_KEY || localStorage.getItem('api_key') || '';

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

    // Add JWT token if available
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');

        if (!refreshToken) {
          // No refresh token, redirect to login
          window.location.href = '/admin/login';
          return Promise.reject(error);
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

        // Store new tokens
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', newRefreshToken);

        // Retry original request with new token
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
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
  google: () => api.get('/auth/google'),
  googleCallback: (code: string) => api.get(`/auth/google/callback?code=${code}`),
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
};

export default api;

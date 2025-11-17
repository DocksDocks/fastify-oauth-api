/**
 * Ingresse API Service
 * Handles external API calls to Ingresse ticketing platform
 */

import { env } from '@/config/env';
import { AppError } from '@/utils/errors';
import type {
  IngresseApiResponse,
  LoginResponseData,
  MfaResponseData,
  UserInfoData,
} from '../types/ingresse.types';

const API_URL = env.INGRESSE_API_PROXY_URL;
const TIMEOUT = env.INGRESSE_API_TIMEOUT;

/**
 * Makes a request to the Ingresse API
 * @param endpoint - API endpoint path (e.g., '/api/ingresse/auth/login')
 * @param options - Fetch options (method, body, headers, etc.)
 * @returns Promise with typed response data
 */
async function makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<IngresseApiResponse<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new AppError(
        response.status,
        `Ingresse API HTTP error: ${response.statusText}`,
        'INGRESSE_API_HTTP_ERROR'
      );
    }

    const data = (await response.json()) as IngresseApiResponse<T>;

    // Check if API returned an error in the response
    if (data.responseError !== null && data.responseError !== undefined) {
      throw new AppError(
        data.responseStatus || 500,
        typeof data.responseError === 'string'
          ? data.responseError
          : JSON.stringify(data.responseError),
        'INGRESSE_API_ERROR'
      );
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError(408, 'Ingresse API request timeout', 'TIMEOUT');
    }

    throw error;
  }
}

/**
 * Login to Ingresse
 * @param email - User email
 * @param password - User password
 * @returns Login response data (may require MFA)
 */
export async function loginToIngresse(email: string, password: string): Promise<LoginResponseData> {
  const response = await makeRequest<LoginResponseData>('/api/ingresse/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  return response.responseData;
}

/**
 * Verify MFA code
 * @param userToken - User token from login response
 * @param otp - 6-digit MFA code
 * @returns MFA verification response with authToken
 */
export async function verifyMfaCode(userToken: string, otp: string): Promise<MfaResponseData> {
  const response = await makeRequest<MfaResponseData>(
    `/api/ingresse/auth/mfa/verify?usertoken=${encodeURIComponent(userToken)}`,
    {
      method: 'POST',
      body: JSON.stringify({ OTP: otp }),
    }
  );

  return response.responseData;
}

/**
 * Fetch user information from Ingresse
 * @param userId - Ingresse user ID
 * @param userToken - User token from login/MFA
 * @returns Complete user profile data
 */
export async function fetchUserInfo(userId: number, userToken: string): Promise<UserInfoData> {
  const response = await makeRequest<UserInfoData>(
    `/api/ingresse/users/${userId}?usertoken=${encodeURIComponent(userToken)}`
  );

  return response.responseData;
}

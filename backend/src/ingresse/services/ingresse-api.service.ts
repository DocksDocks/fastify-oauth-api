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
import type {
  WalletResponse,
  PastTicketsResponse,
  TicketQRCodeResponse,
  TransferUserSearchResponse,
  TransferTicketRequest,
  TransferTicketResponse,
  TransferActionRequest,
  TransferActionResponse,
  PendingTransfersResponse,
} from '../types/wallet.types';
import type {
  BackstageEventsResponse,
  EventDetailsResponse,
} from '../types/events.types';

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

// ==================== EVENTS API ====================

/**
 * Get all events from Backstage
 * @returns List of active events
 */
export async function getAllEvents(): Promise<BackstageEventsResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const response = await fetch(`${API_URL}/shows?filter=ativo`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'BackstageMirante/1.0 (Mobile App)',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new AppError(
        response.status,
        `Failed to fetch events: ${response.statusText}`,
        'BACKSTAGE_API_ERROR'
      );
    }

    const data = (await response.json()) as BackstageEventsResponse;
    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError(408, 'Backstage API request timeout', 'TIMEOUT');
    }

    throw error;
  }
}

/**
 * Get event details from Ingresse
 * @param eventId - Event ID
 * @returns Event details with sessions and venue
 */
export async function getEventDetails(eventId: number): Promise<EventDetailsResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const response = await fetch(`${API_URL}/event/${eventId}?companyId=31`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new AppError(
        response.status,
        `Failed to fetch event details: ${response.statusText}`,
        'INGRESSE_API_ERROR'
      );
    }

    const data = (await response.json()) as EventDetailsResponse;
    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError(408, 'Ingresse API request timeout', 'TIMEOUT');
    }

    throw error;
  }
}

// ==================== WALLET API ====================

/**
 * Get user's wallet (upcoming tickets)
 * @param userId - Ingresse user ID
 * @param userToken - User token
 * @returns Wallet with upcoming event tickets
 */
export async function getUserWallet(userId: string, userToken: string): Promise<WalletResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const response = await fetch(
      `${API_URL}/wallet/user/${userId}/wallet?from=yesterday&order=ASC&pageSize=12&usertoken=${encodeURIComponent(userToken)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new AppError(
        response.status,
        `Failed to fetch wallet: ${response.statusText}`,
        'WALLET_API_ERROR'
      );
    }

    const data = (await response.json()) as WalletResponse;

    if (data.responseError) {
      throw new AppError(
        data.responseStatus || 500,
        data.responseError,
        'WALLET_API_ERROR'
      );
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError(408, 'Wallet API request timeout', 'TIMEOUT');
    }

    throw error;
  }
}

/**
 * Get user's past tickets
 * @param userId - Ingresse user ID
 * @param userToken - User token
 * @returns Past event tickets
 */
export async function getUserPastTickets(userId: string, userToken: string): Promise<PastTicketsResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const response = await fetch(
      `${API_URL}/wallet/user/${userId}/past-tickets?order=DESC&pageSize=12&usertoken=${encodeURIComponent(userToken)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new AppError(
        response.status,
        `Failed to fetch past tickets: ${response.statusText}`,
        'WALLET_API_ERROR'
      );
    }

    const data = (await response.json()) as PastTicketsResponse;

    if (data.responseError) {
      throw new AppError(
        data.responseStatus || 500,
        data.responseError,
        'WALLET_API_ERROR'
      );
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError(408, 'Wallet API request timeout', 'TIMEOUT');
    }

    throw error;
  }
}

/**
 * Get user's tickets for a specific event
 * @param userId - Ingresse user ID
 * @param eventId - Event ID
 * @param userToken - User token
 * @returns Tickets with QR codes
 */
export async function getUserTickets(
  userId: string,
  eventId: number,
  userToken: string
): Promise<TicketQRCodeResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const response = await fetch(
      `${API_URL}/wallet/user/${userId}/tickets?eventId=${eventId}&usertoken=${encodeURIComponent(userToken)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new AppError(
        response.status,
        `Failed to fetch tickets: ${response.statusText}`,
        'WALLET_API_ERROR'
      );
    }

    const data = (await response.json()) as TicketQRCodeResponse;

    if (data.responseError) {
      throw new AppError(
        data.responseStatus || 500,
        data.responseError,
        'WALLET_API_ERROR'
      );
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError(408, 'Wallet API request timeout', 'TIMEOUT');
    }

    throw error;
  }
}

/**
 * Get pending ticket transfers
 * @param userId - Ingresse user ID
 * @param userToken - User token
 * @returns Pending ticket transfers
 */
export async function getPendingTransfers(userId: string, userToken: string): Promise<PendingTransfersResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const response = await fetch(
      `${API_URL}/wallet/user/${userId}/transfers?status=pending&usertoken=${encodeURIComponent(userToken)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new AppError(
        response.status,
        `Failed to fetch pending transfers: ${response.statusText}`,
        'WALLET_API_ERROR'
      );
    }

    const data = (await response.json()) as PendingTransfersResponse;

    if (data.responseError) {
      throw new AppError(
        data.responseStatus || 500,
        data.responseError,
        'WALLET_API_ERROR'
      );
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError(408, 'Wallet API request timeout', 'TIMEOUT');
    }

    throw error;
  }
}

/**
 * Search for user to transfer ticket to
 * @param email - Email to search for
 * @param userToken - User token
 * @returns List of matching users
 */
export async function searchTransferUser(email: string, userToken: string): Promise<TransferUserSearchResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const response = await fetch(
      `${API_URL}/wallet/search/transfer/user?term=${encodeURIComponent(email)}&usertoken=${encodeURIComponent(userToken)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new AppError(
        response.status,
        `Failed to search transfer user: ${response.statusText}`,
        'WALLET_API_ERROR'
      );
    }

    const data = (await response.json()) as TransferUserSearchResponse;

    if (data.responseError) {
      throw new AppError(
        data.responseStatus || 500,
        data.responseError,
        'WALLET_API_ERROR'
      );
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError(408, 'Wallet API request timeout', 'TIMEOUT');
    }

    throw error;
  }
}

/**
 * Transfer a ticket to another user
 * @param ticketId - Ticket ID
 * @param transferData - Transfer request data
 * @param userToken - User token
 * @returns Transfer response
 */
export async function transferTicket(
  ticketId: number,
  transferData: TransferTicketRequest,
  userToken: string
): Promise<TransferTicketResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const response = await fetch(
      `${API_URL}/wallet/ticket/${ticketId}/transfer?usertoken=${encodeURIComponent(userToken)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transferData),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new AppError(
        response.status,
        `Failed to transfer ticket: ${response.statusText}`,
        'WALLET_API_ERROR'
      );
    }

    const data = (await response.json()) as TransferTicketResponse;

    if (data.responseError) {
      throw new AppError(
        data.responseStatus || 500,
        data.responseError,
        'WALLET_API_ERROR'
      );
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError(408, 'Wallet API request timeout', 'TIMEOUT');
    }

    throw error;
  }
}

/**
 * Perform transfer action (cancel/accept/refuse)
 * @param ticketId - Ticket ID
 * @param transferId - Transfer ID
 * @param action - Action to perform
 * @param userToken - User token
 * @returns Transfer action response
 */
export async function performTransferAction(
  ticketId: number,
  transferId: number,
  action: 'cancel' | 'accept' | 'refuse',
  userToken: string
): Promise<TransferActionResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const actionData: TransferActionRequest = { action };

    const response = await fetch(
      `${API_URL}/wallet/ticket/${ticketId}/transfer/${transferId}?usertoken=${encodeURIComponent(userToken)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(actionData),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new AppError(
        response.status,
        `Failed to ${action} transfer: ${response.statusText}`,
        'WALLET_API_ERROR'
      );
    }

    const data = (await response.json()) as TransferActionResponse;

    if (data.responseError) {
      throw new AppError(
        data.responseStatus || 500,
        data.responseError,
        'WALLET_API_ERROR'
      );
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError(408, 'Wallet API request timeout', 'TIMEOUT');
    }

    throw error;
  }
}

/**
 * Return a ticket
 * @param ticketId - Ticket ID
 * @param userToken - User token
 * @returns Return response
 */
export async function returnTicket(ticketId: number, userToken: string): Promise<TransferTicketResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const response = await fetch(
      `${API_URL}/wallet/ticket/${ticketId}/return?usertoken=${encodeURIComponent(userToken)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new AppError(
        response.status,
        `Failed to return ticket: ${response.statusText}`,
        'WALLET_API_ERROR'
      );
    }

    const data = (await response.json()) as TransferTicketResponse;

    if (data.responseError) {
      throw new AppError(
        data.responseStatus || 500,
        data.responseError,
        'WALLET_API_ERROR'
      );
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError(408, 'Wallet API request timeout', 'TIMEOUT');
    }

    throw error;
  }
}

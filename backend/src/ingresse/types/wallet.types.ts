/**
 * Ingresse Wallet & Tickets Type Definitions
 * Based on Ingresse API v1 responses
 */

/**
 * Base Ingresse API Response wrapper
 */
export interface IngresseApiResponse<T> {
  responseData: T;
  responseDetails: string;
  responseError: string | null;
  responseStatus: number;
}

/**
 * Wallet Ticket (simplified view from wallet endpoint)
 */
export interface WalletTicket {
  id: number; // Event ID
  title: string;
  tickets: number;
  description: string;
  venue: {
    name: string;
    street: string;
  };
}

/**
 * Wallet Response (upcoming tickets)
 */
export interface WalletResponse extends IngresseApiResponse<{
  data: WalletTicket[];
}> {}

/**
 * Past Tickets Response (same structure as WalletResponse)
 */
export interface PastTicketsResponse extends IngresseApiResponse<{
  data: WalletTicket[];
}> {}

/**
 * Detailed Ticket with QR Code
 */
export interface TicketQRCode {
  id: number;
  code: string | null;
  title: string;
  type: string;
  eventTitle: string;
  isTransferable: boolean;
  isTransferCancelable: boolean;
  isReturnable?: boolean;
  transferedTo?: {
    userId: number;
    email: string;
    name: string;
    transferId: number;
    status: string;
  };
  currentHolder: {
    userId: number;
    email: string;
    name: string;
    type: string;
  };
  sessions: {
    data: Array<{
      id: number;
      datetime: string;
    }>;
  };
}

/**
 * Ticket QR Code Response
 */
export interface TicketQRCodeResponse extends IngresseApiResponse<{
  data: TicketQRCode[];
}> {}

/**
 * Transfer User (search result)
 */
export interface TransferUser {
  id: number;
  name: string;
  picture: string;
  email: string;
}

/**
 * Transfer User Search Response
 */
export interface TransferUserSearchResponse extends IngresseApiResponse<TransferUser[]> {}

/**
 * Transfer Ticket Request payload
 */
export interface TransferTicketRequest {
  isReturn: boolean;
  appRestricted: boolean;
  user?: number;
}

/**
 * Transfer Ticket Response
 */
export interface TransferTicketResponse extends IngresseApiResponse<unknown> {}

/**
 * Transfer Action Request (cancel/accept/refuse)
 */
export interface TransferActionRequest {
  action: 'cancel' | 'accept' | 'refuse';
}

/**
 * Transfer Action Response
 */
export interface TransferActionResponse extends IngresseApiResponse<unknown> {}

/**
 * Pending Transfer
 */
export interface PendingTransfer {
  id: number;
  event: {
    id: number;
    title: string;
    type: string;
    status: string;
    saleEnabled: boolean;
    link: string;
    poster: string;
    timezone: string;
  };
  session: {
    id: number;
    datetime: string;
  };
  venue: {
    id: number;
    name: string;
    street: string;
    crossStreet: string;
    zipCode: string;
    city: string;
    state: string;
    country: string;
    latitude: number;
    longitude: number;
    hidden: boolean;
    complement: string;
  };
  ticket: {
    id: number;
    guestTypeId: number;
    ticketTypeId: number;
    name: string;
    type: string;
    description: string;
  };
  receivedFrom: {
    userId: number;
    email: string;
    name: string;
    type: string;
    socialId: Array<{
      id: string;
      network: string;
    }>;
    picture: string;
    transferId: number;
    status: string;
    history: Array<{
      status: string;
      creationDate: string;
    }>;
  };
  sessions: {
    data: Array<{
      id: number;
      datetime: string;
    }>;
  };
}

/**
 * Pending Transfers Response
 */
export interface PendingTransfersResponse extends IngresseApiResponse<{
  paginationInfo: {
    currentPage: number;
    lastPage: number;
    totalResults: number;
    pageSize: number;
  };
  data: PendingTransfer[];
}> {}

/**
 * Ingresse API Type Definitions
 * Types for Ingresse ticketing platform API requests and responses
 */

/**
 * Generic Ingresse API Response Wrapper
 */
export interface IngresseApiResponse<T> {
  responseData: T;
  responseDetails: string;
  responseError: unknown;
  responseStatus: number;
}

/**
 * Device Information (returned in login/MFA responses)
 */
export interface IngresseDevice {
  id: string | null;
  name: string;
  creationdate: string;
  mfa: boolean;
  verified: boolean;
  mfaRequired?: boolean;
  verified_by_phone?: boolean;
}

/**
 * Login Response Data
 */
export interface LoginResponseData {
  status: boolean;
  data: {
    token: string;
    userId: number;
    authToken?: string;
    device: IngresseDevice;
  };
  message?: string;
  remainingAttempts?: number;
}

/**
 * MFA Verification Response Data
 */
export interface MfaResponseData {
  status: boolean;
  data: {
    token: string;
    userId: number;
    authToken: string;
    device: IngresseDevice;
  };
}

/**
 * User Phone Data
 */
export interface IngressePhoneData {
  ddi: number;
  number: string;
}

/**
 * User Address Data
 */
export interface IngresseAddressData {
  street: string;
  number: string;
  complement: string;
  district: string;
  zipcode: string;
  city: string;
  state: string;
  country: string | null;
}

/**
 * User Document Data
 */
export interface IngresseDocumentData {
  type: number; // 1 = CPF, 2 = PASSPORT
  number: string;
}

/**
 * User Picture Data
 */
export interface IngressePictureData {
  type: 'small' | 'medium' | 'large';
  link: string;
}

/**
 * User Identity Data
 */
export interface IngresseIdentityData {
  type: {
    id: number;
    name: string;
    mask: string;
    regex: string;
  };
  id: string;
}

/**
 * User Info Response Data (from GET /users/:id)
 */
export interface UserInfoData {
  id: number;
  name: string;
  email: string;
  fbUserId: string | null;
  verified: boolean;
  companyId: number;
  birthdate: string;
  gender: string;
  additionalFields: string;
  createdAt: string;
  modifiedAt: string;
  deletedAt: string | null;
  pictures: IngressePictureData[];
  identity: IngresseIdentityData;
  document: IngresseDocumentData;
  planner: unknown;
  type: number;
  phone: IngressePhoneData;
  address: IngresseAddressData;
  nationality: string;
  faceRecognition: {
    enabled: boolean;
  };
  amount: number;
}

/**
 * Request DTOs
 */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface MfaVerifyRequest {
  userToken: string;
  otp: string;
}

export interface LinkAccountRequest {
  token: string;
  userId: number;
  authToken?: string;
}

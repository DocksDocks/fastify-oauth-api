export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export const successResponse = <T>(data: T): SuccessResponse<T> => ({
  success: true,
  data,
});

export const errorResponse = (code: string, message: string): ErrorResponse => ({
  success: false,
  error: { code, message },
});

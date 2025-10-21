import { describe, it, expect } from 'vitest';
import {
  successResponse,
  errorResponse,
  type SuccessResponse,
  type ErrorResponse,
} from '@/utils/response';

/**
 * Test suite for response formatter utilities
 * Ensures consistent response structure across the API
 */

describe('Response Utilities', () => {
  describe('successResponse', () => {
    it('should create success response with object data', () => {
      const data = { id: 1, name: 'Test User' };
      const response = successResponse(data);

      expect(response).toEqual({
        success: true,
        data: { id: 1, name: 'Test User' },
      });
      expect(response.success).toBe(true);
    });

    it('should create success response with string data', () => {
      const response = successResponse('Operation successful');

      expect(response).toEqual({
        success: true,
        data: 'Operation successful',
      });
    });

    it('should create success response with number data', () => {
      const response = successResponse(42);

      expect(response).toEqual({
        success: true,
        data: 42,
      });
    });

    it('should create success response with array data', () => {
      const data = [1, 2, 3];
      const response = successResponse(data);

      expect(response).toEqual({
        success: true,
        data: [1, 2, 3],
      });
    });

    it('should create success response with null data', () => {
      const response = successResponse(null);

      expect(response).toEqual({
        success: true,
        data: null,
      });
    });

    it('should create success response with boolean data', () => {
      const response = successResponse(true);

      expect(response).toEqual({
        success: true,
        data: true,
      });
    });

    it('should create success response with nested object', () => {
      const data = {
        user: { id: 1, name: 'Test' },
        settings: { theme: 'dark' },
      };
      const response = successResponse(data);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
    });

    it('should have correct TypeScript type', () => {
      const response: SuccessResponse<{ id: number }> = successResponse({ id: 1 });

      expect(response.success).toBe(true);
      expect(response.data.id).toBe(1);
    });
  });

  describe('errorResponse', () => {
    it('should create error response with code and message', () => {
      const response = errorResponse('NOT_FOUND', 'Resource not found');

      expect(response).toEqual({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
        },
      });
    });

    it('should create error response with UNAUTHORIZED code', () => {
      const response = errorResponse('UNAUTHORIZED', 'Authentication required');

      expect(response).toEqual({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    });

    it('should create error response with FORBIDDEN code', () => {
      const response = errorResponse('FORBIDDEN', 'Access denied');

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('FORBIDDEN');
      expect(response.error.message).toBe('Access denied');
    });

    it('should create error response with VALIDATION_ERROR code', () => {
      const response = errorResponse('VALIDATION_ERROR', 'Invalid email format');

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('VALIDATION_ERROR');
      expect(response.error.message).toBe('Invalid email format');
    });

    it('should create error response with BAD_REQUEST code', () => {
      const response = errorResponse('BAD_REQUEST', 'Invalid request parameters');

      expect(response).toEqual({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid request parameters',
        },
      });
    });

    it('should create error response with CONFLICT code', () => {
      const response = errorResponse('CONFLICT', 'Email already exists');

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('CONFLICT');
      expect(response.error.message).toBe('Email already exists');
    });

    it('should create error response with INTERNAL_ERROR code', () => {
      const response = errorResponse('INTERNAL_ERROR', 'Something went wrong');

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INTERNAL_ERROR');
      expect(response.error.message).toBe('Something went wrong');
    });

    it('should have correct TypeScript type', () => {
      const response: ErrorResponse = errorResponse('NOT_FOUND', 'Not found');

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('NOT_FOUND');
      expect(response.error.message).toBe('Not found');
    });
  });

  describe('Response type discrimination', () => {
    it('should be distinguishable by success field', () => {
      const success = successResponse({ id: 1 });
      const error = errorResponse('NOT_FOUND', 'Not found');

      if (success.success) {
        expect(success.data).toBeDefined();
      }

      if (!error.success) {
        expect(error.error).toBeDefined();
      }
    });

    it('should have mutually exclusive structures', () => {
      const success = successResponse('OK');
      const error = errorResponse('ERROR', 'Failed');

      expect('data' in success).toBe(true);
      expect('error' in success).toBe(false);

      expect('error' in error).toBe(true);
      expect('data' in error).toBe(false);
    });
  });
});

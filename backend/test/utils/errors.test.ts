import { describe, it, expect } from 'vitest';
import {
  AppError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
  ValidationError,
  ConflictError,
} from '@/utils/errors';

/**
 * Test suite for custom error classes
 * Ensures all error types have correct status codes, messages, and codes
 */

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create error with all properties', () => {
      const error = new AppError(500, 'Internal server error', 'INTERNAL_ERROR');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Internal server error');
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.name).toBe('AppError');
    });

    it('should create error without code', () => {
      const error = new AppError(500, 'Internal server error');

      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Internal server error');
      expect(error.code).toBeUndefined();
    });

    it('should have stack trace', () => {
      const error = new AppError(500, 'Test error');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AppError');
    });
  });

  describe('UnauthorizedError', () => {
    it('should create error with custom message', () => {
      const error = new UnauthorizedError('Custom unauthorized message');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Custom unauthorized message');
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.name).toBe('UnauthorizedError');
    });

    it('should create error with default message', () => {
      const error = new UnauthorizedError();

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Unauthorized');
      expect(error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('ForbiddenError', () => {
    it('should create error with custom message', () => {
      const error = new ForbiddenError('You do not have permission');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ForbiddenError);
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('You do not have permission');
      expect(error.code).toBe('FORBIDDEN');
      expect(error.name).toBe('ForbiddenError');
    });

    it('should create error with default message', () => {
      const error = new ForbiddenError();

      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Forbidden');
      expect(error.code).toBe('FORBIDDEN');
    });
  });

  describe('NotFoundError', () => {
    it('should create error with custom message', () => {
      const error = new NotFoundError('Resource not found');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Resource not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.name).toBe('NotFoundError');
    });

    it('should create error with default message', () => {
      const error = new NotFoundError();

      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Not found');
      expect(error.code).toBe('NOT_FOUND');
    });
  });

  describe('BadRequestError', () => {
    it('should create error with custom message', () => {
      const error = new BadRequestError('Invalid input data');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid input data');
      expect(error.code).toBe('BAD_REQUEST');
      expect(error.name).toBe('BadRequestError');
    });

    it('should create error with default message', () => {
      const error = new BadRequestError();

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Bad request');
      expect(error.code).toBe('BAD_REQUEST');
    });
  });

  describe('ValidationError', () => {
    it('should create error with custom message', () => {
      const error = new ValidationError('Email format is invalid');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.statusCode).toBe(422);
      expect(error.message).toBe('Email format is invalid');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('ValidationError');
    });

    it('should create error with default message', () => {
      const error = new ValidationError();

      expect(error.statusCode).toBe(422);
      expect(error.message).toBe('Validation error');
      expect(error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('ConflictError', () => {
    it('should create error with custom message', () => {
      const error = new ConflictError('Email already exists');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ConflictError);
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Email already exists');
      expect(error.code).toBe('CONFLICT');
      expect(error.name).toBe('ConflictError');
    });

    it('should create error with default message', () => {
      const error = new ConflictError();

      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Conflict');
      expect(error.code).toBe('CONFLICT');
    });
  });

  describe('Error inheritance', () => {
    it('all custom errors should be instances of Error', () => {
      const errors = [
        new UnauthorizedError(),
        new ForbiddenError(),
        new NotFoundError(),
        new BadRequestError(),
        new ValidationError(),
        new ConflictError(),
      ];

      errors.forEach(error => {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(AppError);
      });
    });

    it('should be catchable as Error', () => {
      try {
        throw new UnauthorizedError('Test error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as UnauthorizedError).statusCode).toBe(401);
      }
    });

    it('should be catchable as AppError', () => {
      try {
        throw new ValidationError('Test validation');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as ValidationError).statusCode).toBe(422);
        expect((error as ValidationError).code).toBe('VALIDATION_ERROR');
      }
    });
  });
});

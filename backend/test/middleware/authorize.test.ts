import { describe, it, expect } from 'vitest';
import type { FastifyReply } from 'fastify';
import {
  requireRole,
  requireAdmin,
  requireSuperadmin,
  requireSelfOrAdmin,
  optionalAuth,
  requireAnyRole,
  type AuthenticatedRequest,
  type UserRole,
} from '@/middleware/authorize';

/**
 * Test suite for authorization middleware
 * Covers all RBAC functions and role hierarchy logic
 */

describe('Authorization Middleware', () => {
  // Helper to create mock request
  const createMockRequest = (user?: {
    id: number;
    email: string;
    role: UserRole;
  }, params?: Record<string, string>): AuthenticatedRequest => {
    const request: Partial<AuthenticatedRequest> = {
      user: user as any,
      params: params || {},
      jwtVerify: async () => {
        if (user) {
          (request as any).user = user;
        } else {
          throw new Error('Invalid token');
        }
      },
    };
    return request as AuthenticatedRequest;
  };

  // Helper to create mock reply
  const createMockReply = () => {
    const reply: Partial<FastifyReply> = {
      code: function (statusCode: number) {
        (this as any).statusCode = statusCode;
        return this as FastifyReply;
      },
      send: function (payload: unknown) {
        (this as any).payload = payload;
        return this as FastifyReply;
      },
    };
    return reply as FastifyReply;
  };

  describe('requireRole', () => {
    it('should allow user with exact required role', async () => {
      const request = createMockRequest({
        id: 1,
        email: 'user@test.com',
        role: 'admin',
      });
      const reply = createMockReply();

      const middleware = requireRole('admin');
      await middleware(request, reply);

      expect((reply as any).statusCode).toBeUndefined();
      expect((reply as any).payload).toBeUndefined();
    });

    it('should allow user with higher role (superadmin accessing admin route)', async () => {
      const request = createMockRequest({
        id: 1,
        email: 'superadmin@test.com',
        role: 'superadmin',
      });
      const reply = createMockReply();

      const middleware = requireRole('admin');
      await middleware(request, reply);

      expect((reply as any).statusCode).toBeUndefined();
      expect((reply as any).payload).toBeUndefined();
    });

    it('should deny user with lower role', async () => {
      const request = createMockRequest({
        id: 1,
        email: 'user@test.com',
        role: 'user',
      });
      const reply = createMockReply();

      const middleware = requireRole('admin');
      await middleware(request, reply);

      expect((reply as any).statusCode).toBe(403);
      expect((reply as any).payload).toEqual({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Required role: admin',
          details: {
            userRole: 'user',
            requiredRole: 'admin',
          },
        },
      });
    });

    it('should deny unauthenticated request', async () => {
      const request = createMockRequest();
      const reply = createMockReply();

      const middleware = requireRole('user');
      await middleware(request, reply);

      expect((reply as any).statusCode).toBe(401);
      expect((reply as any).payload).toEqual({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    });
  });

  describe('requireAdmin', () => {
    it('should allow admin access', async () => {
      const request = createMockRequest({
        id: 1,
        email: 'admin@test.com',
        role: 'admin',
      });
      const reply = createMockReply();

      await requireAdmin(request, reply);

      expect((reply as any).statusCode).toBeUndefined();
      expect((reply as any).payload).toBeUndefined();
    });

    it('should allow superadmin access', async () => {
      const request = createMockRequest({
        id: 1,
        email: 'superadmin@test.com',
        role: 'superadmin',
      });
      const reply = createMockReply();

      await requireAdmin(request, reply);

      expect((reply as any).statusCode).toBeUndefined();
      expect((reply as any).payload).toBeUndefined();
    });

    it('should deny regular user access', async () => {
      const request = createMockRequest({
        id: 1,
        email: 'user@test.com',
        role: 'user',
      });
      const reply = createMockReply();

      await requireAdmin(request, reply);

      expect((reply as any).statusCode).toBe(403);
      expect((reply as any).payload).toMatchObject({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Required role: admin',
        },
      });
    });
  });

  describe('requireSuperadmin', () => {
    it('should allow superadmin access', async () => {
      const request = createMockRequest({
        id: 1,
        email: 'superadmin@test.com',
        role: 'superadmin',
      });
      const reply = createMockReply();

      await requireSuperadmin(request, reply);

      expect((reply as any).statusCode).toBeUndefined();
      expect((reply as any).payload).toBeUndefined();
    });

    it('should deny admin access', async () => {
      const request = createMockRequest({
        id: 1,
        email: 'admin@test.com',
        role: 'admin',
      });
      const reply = createMockReply();

      await requireSuperadmin(request, reply);

      expect((reply as any).statusCode).toBe(403);
      expect((reply as any).payload).toMatchObject({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Required role: superadmin',
        },
      });
    });

    it('should deny regular user access', async () => {
      const request = createMockRequest({
        id: 1,
        email: 'user@test.com',
        role: 'user',
      });
      const reply = createMockReply();

      await requireSuperadmin(request, reply);

      expect((reply as any).statusCode).toBe(403);
    });
  });

  describe('requireSelfOrAdmin', () => {
    it('should allow user to access their own data', async () => {
      const request = createMockRequest(
        {
          id: 123,
          email: 'user@test.com',
          role: 'user',
        },
        { id: '123' }
      );
      const reply = createMockReply();

      const middleware = requireSelfOrAdmin();
      await middleware(request, reply);

      expect((reply as any).statusCode).toBeUndefined();
      expect((reply as any).payload).toBeUndefined();
    });

    it('should allow admin to access other user data', async () => {
      const request = createMockRequest(
        {
          id: 1,
          email: 'admin@test.com',
          role: 'admin',
        },
        { id: '999' }
      );
      const reply = createMockReply();

      const middleware = requireSelfOrAdmin();
      await middleware(request, reply);

      expect((reply as any).statusCode).toBeUndefined();
      expect((reply as any).payload).toBeUndefined();
    });

    it('should allow superadmin to access other user data', async () => {
      const request = createMockRequest(
        {
          id: 1,
          email: 'superadmin@test.com',
          role: 'superadmin',
        },
        { id: '999' }
      );
      const reply = createMockReply();

      const middleware = requireSelfOrAdmin();
      await middleware(request, reply);

      expect((reply as any).statusCode).toBeUndefined();
      expect((reply as any).payload).toBeUndefined();
    });

    it('should deny user accessing other user data', async () => {
      const request = createMockRequest(
        {
          id: 123,
          email: 'user@test.com',
          role: 'user',
        },
        { id: '999' }
      );
      const reply = createMockReply();

      const middleware = requireSelfOrAdmin();
      await middleware(request, reply);

      expect((reply as any).statusCode).toBe(403);
      expect((reply as any).payload).toEqual({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only access your own data',
        },
      });
    });

    it('should deny unauthenticated request', async () => {
      const request = createMockRequest(undefined, { id: '123' });
      const reply = createMockReply();

      const middleware = requireSelfOrAdmin();
      await middleware(request, reply);

      expect((reply as any).statusCode).toBe(401);
      expect((reply as any).payload).toEqual({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    });
  });

  describe('optionalAuth', () => {
    it('should populate user when valid token provided', async () => {
      const user = {
        id: 1,
        email: 'user@test.com',
        role: 'user' as UserRole,
      };
      const request = createMockRequest(user);
      const reply = createMockReply();

      await optionalAuth(request, reply);

      expect(request.user).toEqual(user);
    });

    it('should not throw error when no token provided', async () => {
      const request = createMockRequest();
      const reply = createMockReply();

      await optionalAuth(request, reply);

      expect(request.user).toBeUndefined();
      expect((reply as any).statusCode).toBeUndefined();
    });

    it('should not throw error when invalid token provided', async () => {
      const request = createMockRequest();
      const reply = createMockReply();

      // Simulate jwtVerify throwing an error
      request.jwtVerify = async () => {
        throw new Error('Invalid token');
      };

      await optionalAuth(request, reply);

      expect(request.user).toBeUndefined();
      expect((reply as any).statusCode).toBeUndefined();
    });
  });

  describe('requireAnyRole', () => {
    it('should allow user with one of the allowed roles (admin)', async () => {
      const request = createMockRequest({
        id: 1,
        email: 'admin@test.com',
        role: 'admin',
      });
      const reply = createMockReply();

      const middleware = requireAnyRole(['admin', 'superadmin']);
      await middleware(request, reply);

      expect((reply as any).statusCode).toBeUndefined();
      expect((reply as any).payload).toBeUndefined();
    });

    it('should allow user with higher role than minimum allowed', async () => {
      const request = createMockRequest({
        id: 1,
        email: 'superadmin@test.com',
        role: 'superadmin',
      });
      const reply = createMockReply();

      const middleware = requireAnyRole(['user', 'admin']);
      await middleware(request, reply);

      expect((reply as any).statusCode).toBeUndefined();
      expect((reply as any).payload).toBeUndefined();
    });

    it('should deny user without any allowed role', async () => {
      const request = createMockRequest({
        id: 1,
        email: 'user@test.com',
        role: 'user',
      });
      const reply = createMockReply();

      const middleware = requireAnyRole(['admin', 'superadmin']);
      await middleware(request, reply);

      expect((reply as any).statusCode).toBe(403);
      expect((reply as any).payload).toEqual({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Required roles: admin, superadmin',
          details: {
            userRole: 'user',
            allowedRoles: ['admin', 'superadmin'],
          },
        },
      });
    });

    it('should deny unauthenticated request', async () => {
      const request = createMockRequest();
      const reply = createMockReply();

      const middleware = requireAnyRole(['admin', 'superadmin']);
      await middleware(request, reply);

      expect((reply as any).statusCode).toBe(401);
      expect((reply as any).payload).toEqual({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    });
  });
});

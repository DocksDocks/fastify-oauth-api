import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Role-Based Access Control (RBAC) Middleware
 *
 * Provides authorization functions to protect routes based on user roles.
 *
 * Usage:
 *   import { requireAdmin, requireRole } from '@/middleware/authorize';
 *
 *   // Protect route - admin only
 *   fastify.get('/admin/users', { preHandler: requireAdmin }, async (request, reply) => {
 *     // Only admins can access this route
 *   });
 *
 *   // Protect route - specific role
 *   fastify.get('/superadmin/settings', { preHandler: requireRole('superadmin') }, async (request, reply) => {
 *     // Only superadmins can access this route
 *   });
 */

export type UserRole = 'user' | 'admin' | 'superadmin';

/**
 * Extended FastifyRequest with user information from JWT
 */
export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: number;
    email: string;
    role: UserRole;
    iat?: number;
    exp?: number;
  };
}

/**
 * Role hierarchy for permission checks
 * Higher index = higher privilege
 */
const ROLE_HIERARCHY: UserRole[] = ['user', 'admin', 'superadmin'];

/**
 * Check if a role has sufficient privileges
 *
 * @param userRole - The user's current role
 * @param requiredRole - The minimum required role
 * @returns true if user has sufficient privileges
 */
function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const userLevel = ROLE_HIERARCHY.indexOf(userRole);
  const requiredLevel = ROLE_HIERARCHY.indexOf(requiredRole);
  return userLevel >= requiredLevel;
}

/**
 * Generic role authorization middleware
 *
 * @param requiredRole - Minimum role required to access the route
 * @returns Fastify preHandler function
 *
 * @example
 * ```ts
 * fastify.get('/protected', { preHandler: requireRole('admin') }, async (req, reply) => {
 *   // Only users with admin or superadmin role can access
 * });
 * ```
 */
export function requireRole(requiredRole: UserRole) {
  return async (request: AuthenticatedRequest, reply: FastifyReply): Promise<void> => {
    // Check if user is authenticated
    if (!request.user) {
      return reply.code(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    // Check if user has required role
    if (!hasRole(request.user.role, requiredRole)) {
      return reply.code(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Required role: ${requiredRole}`,
          details: {
            userRole: request.user.role,
            requiredRole,
          },
        },
      });
    }
  };
}

/**
 * Admin-only authorization middleware
 *
 * Shorthand for requireRole('admin')
 * Allows both 'admin' and 'superadmin' roles
 *
 * @example
 * ```ts
 * fastify.get('/admin/dashboard', { preHandler: requireAdmin }, async (req, reply) => {
 *   // Only admins and superadmins can access
 * });
 * ```
 */
export async function requireAdmin(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  return requireRole('admin')(request, reply);
}

/**
 * Superadmin-only authorization middleware
 *
 * Shorthand for requireRole('superadmin')
 * Only allows 'superadmin' role
 *
 * @example
 * ```ts
 * fastify.delete('/superadmin/system/reset', { preHandler: requireSuperadmin }, async (req, reply) => {
 *   // Only superadmins can access
 * });
 * ```
 */
export async function requireSuperadmin(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  return requireRole('superadmin')(request, reply);
}

/**
 * Check if authenticated user matches the requested user ID
 *
 * Useful for routes where users can only access their own data,
 * but admins can access any user's data
 *
 * @param allowAdmin - If true, admins can access any user's data (default: true)
 * @returns Fastify preHandler function
 *
 * @example
 * ```ts
 * fastify.get('/users/:id/profile', { preHandler: requireSelfOrAdmin() }, async (req, reply) => {
 *   // User can only access their own profile, but admins can access any profile
 * });
 * ```
 */
export function requireSelfOrAdmin(allowAdmin = true) {
  return async (request: AuthenticatedRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      return reply.code(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    const { id } = request.params as { id: string };
    const requestedUserId = parseInt(id, 10);

    // Check if user is accessing their own data
    if (request.user.id === requestedUserId) {
      return;
    }

    // Check if user is admin (if allowed)
    if (allowAdmin && hasRole(request.user.role, 'admin')) {
      return;
    }

    // Access denied
    return reply.code(403).send({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'You can only access your own data',
      },
    });
  };
}

/**
 * Optional authentication middleware
 *
 * Does not block unauthenticated requests, but populates request.user if authenticated
 * Useful for routes that have different behavior for authenticated vs unauthenticated users
 *
 * @example
 * ```ts
 * fastify.get('/posts', { preHandler: optionalAuth }, async (req, reply) => {
 *   if (req.user) {
 *     // Show personalized posts
 *   } else {
 *     // Show public posts
 *   }
 * });
 * ```
 */
export async function optionalAuth(
  _request: AuthenticatedRequest,
  _reply: FastifyReply
): Promise<void> {
  // This middleware does nothing - authentication is handled by @fastify/jwt
  // If JWT is present and valid, request.user will be populated
  // If JWT is missing or invalid, request.user will be undefined
  // No error is thrown in either case
}

/**
 * Check if user has any of the specified roles
 *
 * @param allowedRoles - Array of roles that are allowed
 * @returns Fastify preHandler function
 *
 * @example
 * ```ts
 * fastify.get('/moderator/dashboard',
 *   { preHandler: requireAnyRole(['admin', 'superadmin']) },
 *   async (req, reply) => {
 *     // Either admin or superadmin can access
 *   }
 * );
 * ```
 */
export function requireAnyRole(allowedRoles: UserRole[]) {
  return async (request: AuthenticatedRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      return reply.code(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    const hasAllowedRole = allowedRoles.some(role =>
      hasRole(request.user!.role, role)
    );

    if (!hasAllowedRole) {
      return reply.code(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
          details: {
            userRole: request.user.role,
            allowedRoles,
          },
        },
      });
    }
  };
}

import { describe, it, expect } from 'vitest';
import { hasRole, hasAnyRole } from '@/utils/jwt';
import type { JWTPayload } from '@/modules/auth/auth.types';

/**
 * Test suite for JWT utility functions
 * Focuses on hasRole() which was previously untested (86% coverage)
 */

describe('JWT Utilities', () => {
  describe('hasRole', () => {
    it('should return true when role matches - user', () => {
      const decoded: JWTPayload = {
        id: 1,
        email: 'user@test.com',
        role: 'user',
      };

      const result = hasRole(decoded, 'user');

      expect(result).toBe(true);
    });

    it('should return true when role matches - coach', () => {
      const decoded: JWTPayload = {
        id: 2,
        email: 'coach@test.com',
        role: 'coach',
      };

      const result = hasRole(decoded, 'coach');

      expect(result).toBe(true);
    });

    it('should return true when role matches - admin', () => {
      const decoded: JWTPayload = {
        id: 3,
        email: 'admin@test.com',
        role: 'admin',
      };

      const result = hasRole(decoded, 'admin');

      expect(result).toBe(true);
    });

    it('should return true when role matches - superadmin', () => {
      const decoded: JWTPayload = {
        id: 4,
        email: 'superadmin@test.com',
        role: 'superadmin',
      };

      const result = hasRole(decoded, 'superadmin');

      expect(result).toBe(true);
    });

    it('should return false when role does not match', () => {
      const decoded: JWTPayload = {
        id: 1,
        email: 'user@test.com',
        role: 'user',
      };

      const result = hasRole(decoded, 'admin');

      expect(result).toBe(false);
    });

    it('should return false when decoded token is null', () => {
      const result = hasRole(null, 'admin');

      expect(result).toBe(false);
    });

    it('should return false when decoded token is undefined', () => {
      const result = hasRole(null, 'user');

      expect(result).toBe(false);
    });

    it('should return false when checking admin role for user', () => {
      const decoded: JWTPayload = {
        id: 1,
        email: 'user@test.com',
        role: 'user',
      };

      const result = hasRole(decoded, 'admin');

      expect(result).toBe(false);
    });

    it('should return false when checking user role for admin', () => {
      const decoded: JWTPayload = {
        id: 3,
        email: 'admin@test.com',
        role: 'admin',
      };

      const result = hasRole(decoded, 'user');

      expect(result).toBe(false);
    });

    it('should return false when checking superadmin role for admin', () => {
      const decoded: JWTPayload = {
        id: 3,
        email: 'admin@test.com',
        role: 'admin',
      };

      const result = hasRole(decoded, 'superadmin');

      expect(result).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('should return true when user has one of the specified roles', () => {
      const decoded: JWTPayload = {
        id: 3,
        email: 'admin@test.com',
        role: 'admin',
      };

      const result = hasAnyRole(decoded, ['admin', 'superadmin']);

      expect(result).toBe(true);
    });

    it('should return true when user role matches first in array', () => {
      const decoded: JWTPayload = {
        id: 1,
        email: 'user@test.com',
        role: 'user',
      };

      const result = hasAnyRole(decoded, ['user', 'coach']);

      expect(result).toBe(true);
    });

    it('should return true when user role matches last in array', () => {
      const decoded: JWTPayload = {
        id: 4,
        email: 'superadmin@test.com',
        role: 'superadmin',
      };

      const result = hasAnyRole(decoded, ['user', 'coach', 'admin', 'superadmin']);

      expect(result).toBe(true);
    });

    it('should return false when user does not have any of the specified roles', () => {
      const decoded: JWTPayload = {
        id: 1,
        email: 'user@test.com',
        role: 'user',
      };

      const result = hasAnyRole(decoded, ['admin', 'superadmin']);

      expect(result).toBe(false);
    });

    it('should return false when decoded token is null', () => {
      const result = hasAnyRole(null, ['admin', 'superadmin']);

      expect(result).toBe(false);
    });

    it('should return false when decoded token is undefined', () => {
      const result = hasAnyRole(null, ['user', 'coach']);

      expect(result).toBe(false);
    });

    it('should return true for coach checking coach or admin', () => {
      const decoded: JWTPayload = {
        id: 2,
        email: 'coach@test.com',
        role: 'coach',
      };

      const result = hasAnyRole(decoded, ['coach', 'admin']);

      expect(result).toBe(true);
    });

    it('should return false when role array is empty', () => {
      const decoded: JWTPayload = {
        id: 1,
        email: 'user@test.com',
        role: 'user',
      };

      const result = hasAnyRole(decoded, []);

      expect(result).toBe(false);
    });

    it('should handle single role in array', () => {
      const decoded: JWTPayload = {
        id: 3,
        email: 'admin@test.com',
        role: 'admin',
      };

      const result = hasAnyRole(decoded, ['admin']);

      expect(result).toBe(true);
    });
  });

  describe('Integration scenarios', () => {
    it('hasRole should be more specific than hasAnyRole', () => {
      const decoded: JWTPayload = {
        id: 3,
        email: 'admin@test.com',
        role: 'admin',
      };

      // hasRole checks exact match
      expect(hasRole(decoded, 'admin')).toBe(true);
      expect(hasRole(decoded, 'superadmin')).toBe(false);

      // hasAnyRole checks if role is in array
      expect(hasAnyRole(decoded, ['admin', 'superadmin'])).toBe(true);
    });

    it('should handle all role types consistently', () => {
      const roles: Array<'user' | 'coach' | 'admin' | 'superadmin'> = [
        'user',
        'coach',
        'admin',
        'superadmin',
      ];

      roles.forEach((role) => {
        const decoded: JWTPayload = {
          id: 1,
          email: 'test@test.com',
          role,
        };

        // Exact role match should return true
        expect(hasRole(decoded, role)).toBe(true);

        // Should be found in array of all roles
        expect(hasAnyRole(decoded, roles)).toBe(true);

        // Should not match different roles
        const otherRoles = roles.filter((r) => r !== role);
        otherRoles.forEach((otherRole) => {
          expect(hasRole(decoded, otherRole)).toBe(false);
        });
      });
    });
  });
});

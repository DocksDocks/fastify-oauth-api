import { createUser, generateTestToken } from './factories';

/**
 * RBAC Test Helpers
 * Utilities for creating users with specific roles and JWT tokens
 * Makes RBAC testing cleaner and more maintainable
 */

export interface UserWithToken {
  id: number;
  email: string;
  name: string | null;
  role: 'user' | 'admin' | 'superadmin';
  token: string;
}

/**
 * Create a regular user with JWT token
 * @param overrides - Optional user properties to override
 * @returns User object with access token
 */
export async function createRegularUser(
  overrides: { email?: string; name?: string } = {}
): Promise<UserWithToken> {
  const timestamp = Date.now();
  const user = await createUser({
    email: overrides.email || `user-${timestamp}@test.com`,
    name: overrides.name || 'Regular User',
    role: 'user',
  });

  const { accessToken } = await generateTestToken({
    id: user.id,
    email: user.email,
    role: 'user',
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: 'user',
    token: accessToken,
  };
}

/**
 * Create an admin user with JWT token
 * @param overrides - Optional user properties to override
 * @returns User object with access token
 */
export async function createAdminUser(
  overrides: { email?: string; name?: string } = {}
): Promise<UserWithToken> {
  const timestamp = Date.now();
  const user = await createUser({
    email: overrides.email || `admin-${timestamp}@test.com`,
    name: overrides.name || 'Admin User',
    role: 'admin',
  });

  const { accessToken } = await generateTestToken({
    id: user.id,
    email: user.email,
    role: 'admin',
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: 'admin',
    token: accessToken,
  };
}

/**
 * Create a superadmin user with JWT token
 * @param overrides - Optional user properties to override
 * @returns User object with access token
 */
export async function createSuperadminUser(
  overrides: { email?: string; name?: string } = {}
): Promise<UserWithToken> {
  const timestamp = Date.now();
  const user = await createUser({
    email: overrides.email || `superadmin-${timestamp}@test.com`,
    name: overrides.name || 'Superadmin User',
    role: 'superadmin',
  });

  const { accessToken } = await generateTestToken({
    id: user.id,
    email: user.email,
    role: 'superadmin',
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: 'superadmin',
    token: accessToken,
  };
}

/**
 * Create all role types for comprehensive RBAC testing
 * @returns Object with user, admin, and superadmin users with tokens
 */
export async function createAllRoles(): Promise<{
  user: UserWithToken;
  admin: UserWithToken;
  superadmin: UserWithToken;
}> {
  const [user, admin, superadmin] = await Promise.all([
    createRegularUser(),
    createAdminUser(),
    createSuperadminUser(),
  ]);

  return { user, admin, superadmin };
}

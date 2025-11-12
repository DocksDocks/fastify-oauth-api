# RBAC Test Helpers

Utilities for creating users with specific roles and JWT tokens to simplify RBAC testing.

## Quick Start

```typescript
import { createAdminUser, createSuperadminUser, createRegularUser } from './helper/rbac-helpers';

describe('Admin Routes', () => {
  let admin: UserWithToken;
  let user: UserWithToken;

  beforeEach(async () => {
    // Create users with tokens in one line!
    admin = await createAdminUser();
    user = await createRegularUser();
  });

  it('should allow admin access', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/users',
      headers: {
        authorization: `Bearer ${admin.token}`, // Use token directly!
      },
    });

    expect(response.statusCode).toBe(200);
  });

  it('should deny user access', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/users',
      headers: {
        authorization: `Bearer ${user.token}`,
      },
    });

    expect(response.statusCode).toBe(403);
  });
});
```

## Available Helpers

### Individual Role Creation

```typescript
// Create regular user
const user = await createRegularUser();
// Returns: { id, email, name, role: 'user', token }

// Create admin user
const admin = await createAdminUser();
// Returns: { id, email, name, role: 'admin', token }

// Create superadmin user
const superadmin = await createSuperadminUser();
// Returns: { id, email, name, role: 'superadmin', token }
```

**Note:** The system has 3 roles: `user`, `admin`, `superadmin` (no coach role).

### Custom Properties

```typescript
// Override email and name
const user = await createRegularUser({
  email: 'custom@example.com',
  name: 'Custom Name',
});
```

### Create All Roles at Once

```typescript
// For comprehensive RBAC testing
const { user, admin, superadmin } = await createAllRoles();

// Test role hierarchy
expect(user.role).toBe('user');
expect(admin.role).toBe('admin');
expect(superadmin.role).toBe('superadmin');
```

## Benefits

1. **Less Boilerplate**: No need to manually create users and generate tokens separately
2. **Cleaner Tests**: Focus on testing logic, not setup
3. **Consistent**: All tests use the same pattern
4. **Type-Safe**: Returns `UserWithToken` interface with proper types
5. **Maintainable**: Change auth logic in one place, all tests benefit

## Migration Example

### Before (Manual Setup)

```typescript
describe('My Test', () => {
  let adminToken: string;
  let userToken: string;

  beforeEach(async () => {
    // Lots of boilerplate...
    const adminUser = await createUser({
      email: `admin-${Date.now()}@test.com`,
      name: 'Admin User',
      role: 'admin',
    });

    const adminTokens = await generateTestToken({
      id: adminUser.id,
      email: adminUser.email,
      role: 'admin',
    });
    adminToken = adminTokens.accessToken;

    const regularUser = await createUser({
      email: `user-${Date.now()}@test.com`,
      name: 'Regular User',
      role: 'user',
    });

    const userTokens = await generateTestToken({
      id: regularUser.id,
      email: regularUser.email,
      role: 'user',
    });
    userToken = userTokens.accessToken;
  });

  it('test...', async () => {
    // Use adminToken, userToken...
  });
});
```

### After (Using Helpers)

```typescript
import { createAdminUser, createRegularUser } from './helper/rbac-helpers';

describe('My Test', () => {
  let admin: UserWithToken;
  let user: UserWithToken;

  beforeEach(async () => {
    // Clean and simple!
    admin = await createAdminUser();
    user = await createRegularUser();
  });

  it('test...', async () => {
    // Use admin.token, user.token...
    // Access admin.id, admin.email, etc. if needed
  });
});
```

## Usage in Existing Tests

You can gradually migrate existing tests to use these helpers. Both patterns work:

```typescript
// Old pattern (still works)
const token = await generateTestToken({ id, email, role });

// New pattern (recommended)
const { token } = await createAdminUser();
```

## RBAC Testing Pattern

```typescript
describe('RBAC Authorization', () => {
  let user: UserWithToken;
  let admin: UserWithToken;
  let superadmin: UserWithToken;

  beforeEach(async () => {
    ({ user, admin, superadmin } = await createAllRoles());
  });

  describe('Superadmin-only endpoints', () => {
    it('should allow superadmin', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/dangerous-action',
        headers: { authorization: `Bearer ${superadmin.token}` },
      });
      expect(res.statusCode).toBe(200);
    });

    it('should deny admin', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/dangerous-action',
        headers: { authorization: `Bearer ${admin.token}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it('should deny user', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/dangerous-action',
        headers: { authorization: `Bearer ${user.token}` },
      });
      expect(res.statusCode).toBe(403);
    });
  });
});
```

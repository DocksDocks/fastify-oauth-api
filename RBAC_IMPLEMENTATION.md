# RBAC (Role-Based Access Control) Implementation Guide

Complete guide for implementing and using the Role-Based Access Control system in the Fastify OAuth API.

## Overview

The RBAC system has been successfully set up with the following components:

- Database schema with `role` field (user, admin, superadmin)
- Authorization middleware for protecting routes
- Admin seed script for promoting users
- Environment configuration for admin emails

## What's Been Implemented

### 1. Database Schema

**File:** `src/db/schema/users.ts`

The users table now includes:
- `role` field with enum: `'user' | 'admin' | 'superadmin'`
- Default role: `'user'`

Migration generated: `src/db/migrations/0000_powerful_vulcan.sql`

### 2. Authorization Middleware

**File:** `src/middleware/authorize.ts`

Available middleware functions:

```typescript
import {
  requireAdmin,
  requireSuperadmin,
  requireRole,
  requireSelfOrAdmin,
  requireAnyRole,
  optionalAuth
} from '../middleware/authorize.js';
```

#### Usage Examples:

**Protect admin-only routes:**
```typescript
fastify.get('/admin/dashboard',
  { preHandler: requireAdmin },
  async (request, reply) => {
    // Only admins and superadmins can access
  }
);
```

**Protect superadmin-only routes:**
```typescript
fastify.delete('/superadmin/system/reset',
  { preHandler: requireSuperadmin },
  async (request, reply) => {
    // Only superadmins can access
  }
);
```

**Custom role requirement:**
```typescript
fastify.get('/moderator/reports',
  { preHandler: requireRole('admin') },
  async (request, reply) => {
    // Admins and superadmins can access
  }
);
```

**Allow multiple roles:**
```typescript
fastify.get('/moderator/dashboard',
  { preHandler: requireAnyRole(['admin', 'superadmin']) },
  async (request, reply) => {
    // Either admin or superadmin can access
  }
);
```

**User can only access their own data, but admins can access any:**
```typescript
fastify.get('/users/:id/profile',
  { preHandler: requireSelfOrAdmin() },
  async (request, reply) => {
    // User can only view their own profile
    // Admins can view any profile
  }
);
```

### 3. Admin Seed Script

**File:** `src/db/seeds/index.ts`

Promotes existing users to admin role based on emails configured in `.env`.

**Usage:**
```bash
npm run db:seed
```

**Output:**
```
🌱 Starting admin seed...

📧 Admin emails to promote: 2
   1. admin@example.com
   2. admin2@example.com

✅ Promoted to admin: admin@example.com
⚠️  User not found: admin2@example.com

==================================================
📊 Seed Summary:
==================================================
✅ Promoted:       1
✓  Already admin:  0
⚠️  Not found:      1
==================================================

💡 Tip: Users not found must sign in via OAuth first.
   After their first login, run this seed script again.
```

### 4. Environment Configuration

**File:** `.env.example`

New environment variables:

```bash
# ==========================================
# ADMIN CONFIGURATION
# ==========================================
# Primary admin email (auto-promoted on OAuth login)
ADMIN_EMAIL=admin@example.com

# Additional admin emails (comma-separated)
# These users will be auto-promoted to admin role on login
ADMIN_EMAILS_ADDITIONAL=admin2@example.com,admin3@example.com
```

**File:** `src/config/env.ts`

Environment validation with Zod:

```typescript
ADMIN_EMAIL: z.string().email(),
ADMIN_EMAILS_ADDITIONAL: z.string().optional().default(''),
```

## What Still Needs to Be Implemented

### 1. OAuth Authentication Service

When implementing OAuth authentication (Google/Apple), you need to:

#### A. Auto-promote admins on login

In your OAuth callback handler, after creating/updating the user:

```typescript
// Example: src/modules/auth/auth.service.ts

import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { users } from '../../db/schema/users.js';
import env from '../../config/env.js';

export async function handleOAuthCallback(profile: OAuthProfile): Promise<User> {
  const { email, name, avatar, provider, providerId } = profile;

  // Check if user exists
  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Determine role based on admin emails
  const adminEmails = [
    env.ADMIN_EMAIL,
    ...env.ADMIN_EMAILS_ADDITIONAL.split(',').map(e => e.trim()).filter(e => e.length > 0)
  ];
  const shouldBeAdmin = adminEmails.includes(email);

  if (user) {
    // Update existing user
    const updates: any = {
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    };

    // Auto-promote to admin if email matches
    if (shouldBeAdmin && user.role === 'user') {
      updates.role = 'admin';
    }

    [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, user.id))
      .returning();
  } else {
    // Create new user
    [user] = await db
      .insert(users)
      .values({
        email,
        name,
        avatar,
        provider,
        providerId,
        role: shouldBeAdmin ? 'admin' : 'user', // Set role on creation
        lastLoginAt: new Date(),
      })
      .returning();
  }

  return user;
}
```

### 2. JWT Service

When generating JWT tokens, include the user's role:

```typescript
// Example: src/modules/auth/jwt.service.ts

import { FastifyInstance } from 'fastify';

export interface JWTPayload {
  id: number;
  email: string;
  role: 'user' | 'admin' | 'superadmin'; // Include role
  iat?: number;
  exp?: number;
}

export async function generateTokens(
  fastify: FastifyInstance,
  user: User
): Promise<{ accessToken: string; refreshToken: string }> {
  const payload: JWTPayload = {
    id: user.id,
    email: user.email,
    role: user.role, // Include role in JWT
  };

  const accessToken = fastify.jwt.sign(payload, {
    expiresIn: '15m',
  });

  const refreshToken = fastify.jwt.sign(payload, {
    expiresIn: '7d',
  });

  return { accessToken, refreshToken };
}
```

### 3. JWT Authentication Hook

Set up a hook to verify JWT and attach user to request:

```typescript
// Example: src/plugins/auth.ts

import fp from 'fastify-plugin';
import { FastifyInstance, FastifyRequest } from 'fastify';
import { JWTPayload } from '../modules/auth/jwt.service.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  // Register JWT plugin
  await fastify.register(import('@fastify/jwt'), {
    secret: process.env.JWT_SECRET!,
  });

  // Decorate request with authenticate method
  fastify.decorate('authenticate', async (request: FastifyRequest) => {
    try {
      const payload = await request.jwtVerify<JWTPayload>();
      request.user = payload; // Attach user to request
    } catch (err) {
      throw fastify.httpErrors.unauthorized('Invalid or expired token');
    }
  });
});
```

### 4. Protected Routes Example

```typescript
// Example: src/routes/admin/users.ts

import { FastifyInstance } from 'fastify';
import { requireAdmin } from '../../middleware/authorize.js';

export default async function adminUsersRoutes(fastify: FastifyInstance) {
  // List all users (admin only)
  fastify.get('/admin/users',
    {
      preHandler: [
        fastify.authenticate, // First authenticate
        requireAdmin,         // Then check role
      ],
    },
    async (request, reply) => {
      // request.user is available and has admin role
      const users = await db.select().from(users);
      return { success: true, data: users };
    }
  );

  // Update user role (superadmin only)
  fastify.patch('/admin/users/:id/role',
    {
      preHandler: [
        fastify.authenticate,
        requireSuperadmin,
      ],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { role } = request.body as { role: string };

      const [updatedUser] = await db
        .update(users)
        .set({ role, updatedAt: new Date() })
        .where(eq(users.id, parseInt(id)))
        .returning();

      return { success: true, data: updatedUser };
    }
  );
}
```

## Testing the RBAC System

### 1. Set up admin emails

Create `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
nano .env
```

Update admin emails:
```bash
ADMIN_EMAIL=your-admin-email@gmail.com
ADMIN_EMAILS_ADDITIONAL=another-admin@gmail.com
```

### 2. Start the infrastructure

```bash
npm run docker:start
```

### 3. Run migrations

```bash
npm run db:migrate
```

### 4. Sign in via OAuth

Use Google or Apple Sign-In with the admin email you configured.

### 5. Verify role was assigned

Check the database:

```bash
npm run docker:postgres:exec
```

Then run:
```sql
SELECT id, email, role, created_at FROM users;
```

You should see your admin email with `role = 'admin'`.

### 6. Promote existing users (optional)

If you already have users who signed in before setting up RBAC:

```bash
npm run db:seed
```

This will promote any existing users whose emails match the admin configuration.

### 7. Test protected routes

Try accessing an admin-only route:

```bash
# Get JWT token first (from login response)
TOKEN="your-jwt-token"

# Try to access admin route
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/admin/users

# Should return user list if you're admin
# Should return 403 Forbidden if you're not admin
```

## Role Hierarchy

The system uses a role hierarchy where higher roles inherit lower role permissions:

```
user < admin < superadmin
```

**What this means:**
- `requireAdmin` allows both `admin` and `superadmin`
- `requireSuperadmin` only allows `superadmin`
- `requireRole('user')` allows all roles

## Security Best Practices

1. **Never trust client-provided roles**
   - Always fetch role from database or JWT
   - JWT is signed and can't be tampered with

2. **Validate admin emails carefully**
   - Use real, verified email addresses
   - Don't use disposable email domains
   - Keep ADMIN_EMAIL in environment variables, not code

3. **Use HTTPS in production**
   - JWT tokens should only be sent over HTTPS
   - Caddy handles this automatically

4. **Implement token refresh**
   - Access tokens expire in 15 minutes
   - Use refresh tokens (7 days) to get new access tokens

5. **Audit admin actions**
   - Log all admin operations
   - Track who performed which action and when

## Migration Path

If you're adding RBAC to an existing system with users:

1. Run migration to add `role` field (already done)
2. All existing users get `role = 'user'` by default
3. Configure admin emails in `.env`
4. Run seed script: `npm run db:seed`
5. Admins are promoted
6. Future logins auto-promote if email matches

## Troubleshooting

### User not getting admin role on login

**Check:**
1. Email matches exactly (case-sensitive)
2. `.env` file is loaded correctly
3. Auto-promotion logic is implemented in OAuth callback
4. Check database: `SELECT email, role FROM users;`

### "Forbidden" error on admin routes

**Check:**
1. JWT token is valid and not expired
2. Token includes `role` field
3. Middleware order: authenticate first, then authorize
4. User actually has admin role in database

### Seed script shows "User not found"

**This is normal** if the user hasn't signed in yet. Users must:
1. Complete OAuth login first (creates user record)
2. Then run seed script to promote them

**Workaround:** Add auto-promotion logic to OAuth callback (recommended)

## Next Steps

1. Implement OAuth authentication service with auto-promotion logic
2. Implement JWT service to include role in tokens
3. Create admin routes and protect them with `requireAdmin`
4. Test the complete flow: OAuth login → JWT with role → Protected route access
5. Add audit logging for admin actions
6. Consider adding a UI for role management (for superadmins)

---

**Last Updated:** October 2025
**Status:** Schema and middleware implemented, auth integration pending

# JWT Security Improvements Needed

## Critical Issues

### 1. Refresh Token Not Stored in Database (HIGH PRIORITY)

**Current Behavior:**
- Refresh tokens are signed JWTs but never stored in `refresh_tokens` table
- No way to invalidate tokens server-side
- Logout is client-side only

**Required Changes:**

```typescript
// src/modules/auth/jwt.service.ts

import crypto from 'crypto';
import { db } from '@/db/client';
import { refreshTokens } from '@/db/schema/refresh-tokens';
import { eq, and, lt } from 'drizzle-orm';

/**
 * Hash refresh token for secure storage
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate access and refresh tokens with database storage
 */
export async function generateTokens(
  fastify: FastifyInstance,
  user: User,
  ipAddress?: string,
  userAgent?: string
): Promise<TokenPair> {
  const payload: JWTPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  // Generate access token (short-lived)
  const accessToken = fastify.jwt.sign(payload, {
    expiresIn: env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m',
  });

  // Generate refresh token (long-lived)
  const refreshToken = fastify.jwt.sign(payload, {
    expiresIn: env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d',
  });

  // Store refresh token in database
  const familyId = crypto.randomUUID(); // For token rotation family
  const expiresAt = new Date(Date.now() + parseExpiration(env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d') * 1000);

  await db.insert(refreshTokens).values({
    userId: user.id,
    token: hashToken(refreshToken), // Store hashed!
    familyId,
    expiresAt,
    ipAddress,
    userAgent,
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: parseExpiration(env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m'),
  };
}
```

### 2. Implement Token Rotation on Refresh (HIGH PRIORITY)

**Current Behavior:**
- Old refresh token remains valid after use
- No reuse detection

**Required Changes:**

```typescript
/**
 * Refresh access token with token rotation
 */
export async function refreshAccessToken(
  fastify: FastifyInstance,
  refreshToken: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  try {
    // 1. Verify JWT signature
    const decoded = await verifyToken(fastify, refreshToken);
    const hashedToken = hashToken(refreshToken);

    // 2. Check database for token validity
    const [storedToken] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.token, hashedToken),
          eq(refreshTokens.userId, decoded.id)
        )
      )
      .limit(1);

    if (!storedToken) {
      throw new Error('Refresh token not found');
    }

    // 3. Check if revoked
    if (storedToken.isRevoked) {
      throw new Error('Refresh token has been revoked');
    }

    // 4. Check if already used (REUSE DETECTION)
    if (storedToken.isUsed) {
      // Token reuse detected! Revoke entire family
      await db
        .update(refreshTokens)
        .set({ isRevoked: true, revokedAt: new Date() })
        .where(eq(refreshTokens.familyId, storedToken.familyId));

      throw new Error('Token reuse detected - all tokens in family revoked');
    }

    // 5. Check expiration
    if (storedToken.expiresAt < new Date()) {
      throw new Error('Refresh token expired');
    }

    // 6. Mark old token as used
    await db
      .update(refreshTokens)
      .set({ isUsed: true, usedAt: new Date() })
      .where(eq(refreshTokens.id, storedToken.id));

    // 7. Generate NEW refresh token (rotation)
    const payload: JWTPayload = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    const newAccessToken = fastify.jwt.sign(payload, {
      expiresIn: env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m',
    });

    const newRefreshToken = fastify.jwt.sign(payload, {
      expiresIn: env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d',
    });

    // 8. Store new refresh token with same family
    const expiresAt = new Date(
      Date.now() + parseExpiration(env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d') * 1000
    );

    const [newTokenRecord] = await db
      .insert(refreshTokens)
      .values({
        userId: decoded.id,
        token: hashToken(newRefreshToken),
        familyId: storedToken.familyId, // Same family for rotation chain
        expiresAt,
        ipAddress,
        userAgent,
      })
      .returning();

    // 9. Link old token to new one
    await db
      .update(refreshTokens)
      .set({ replacedBy: newTokenRecord!.id })
      .where(eq(refreshTokens.id, storedToken.id));

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: parseExpiration(env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m'),
    };
  } catch (error) {
    const err = error as Error;
    throw new Error(`Token refresh failed: ${err.message}`);
  }
}
```

### 3. Implement Server-Side Logout (HIGH PRIORITY)

**Current Behavior:**
- Logout just returns success message
- Tokens remain valid

**Required Changes:**

```typescript
/**
 * Revoke all refresh tokens for a user (logout from all devices)
 */
export async function revokeAllUserTokens(userId: number): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ isRevoked: true, revokedAt: new Date() })
    .where(
      and(
        eq(refreshTokens.userId, userId),
        eq(refreshTokens.isRevoked, false)
      )
    );
}

/**
 * Revoke single refresh token (logout from this device)
 */
export async function revokeRefreshToken(token: string): Promise<void> {
  const hashedToken = hashToken(token);

  await db
    .update(refreshTokens)
    .set({ isRevoked: true, revokedAt: new Date() })
    .where(eq(refreshTokens.token, hashedToken));
}

/**
 * Revoke token family (logout from all devices that used this token chain)
 */
export async function revokeTokenFamily(familyId: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ isRevoked: true, revokedAt: new Date() })
    .where(eq(refreshTokens.familyId, familyId));
}
```

### 4. Implement Token Cleanup (MEDIUM PRIORITY)

**Add scheduled cleanup of expired tokens:**

```typescript
/**
 * Clean up expired and used refresh tokens
 * Run this periodically (e.g., daily cron job)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await db
    .delete(refreshTokens)
    .where(
      and(
        lt(refreshTokens.expiresAt, new Date()),
        eq(refreshTokens.isUsed, true)
      )
    );

  return result.rowCount || 0;
}
```

### 5. Update Auth Controller (HIGH PRIORITY)

**src/modules/auth/auth.controller.ts changes:**

```typescript
export async function handleRefreshToken(
  request: FastifyRequest<{ Body: { refreshToken: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { refreshToken } = request.body;

    // Pass IP and User-Agent for tracking
    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'];

    const tokens = await refreshAccessToken(
      request.server,
      refreshToken,
      ipAddress,
      userAgent
    );

    reply.send({
      success: true,
      data: tokens,
    });
  } catch (error) {
    const err = error as Error;
    reply.code(401).send({
      success: false,
      error: {
        message: err.message,
        code: 'REFRESH_TOKEN_INVALID',
      },
    });
  }
}

export async function handleLogout(
  request: FastifyRequest<{ Body: { refreshToken?: string; logoutAll?: boolean } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { refreshToken, logoutAll } = request.body;
    const user = request.user!; // From JWT authentication

    if (logoutAll) {
      // Logout from all devices
      await revokeAllUserTokens(user.id);
    } else if (refreshToken) {
      // Logout from this device only
      await revokeRefreshToken(refreshToken);
    }

    reply.send({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  } catch (error) {
    const err = error as Error;
    reply.code(500).send({
      success: false,
      error: {
        message: 'Logout failed',
        code: 'LOGOUT_ERROR',
      },
    });
  }
}
```

### 6. Add Session Management Endpoints (MEDIUM PRIORITY)

**New routes for user session management:**

```typescript
// GET /api/auth/sessions - List active sessions
export async function getUserSessions(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const user = request.user!;

  const sessions = await db
    .select({
      id: refreshTokens.id,
      createdAt: refreshTokens.createdAt,
      expiresAt: refreshTokens.expiresAt,
      ipAddress: refreshTokens.ipAddress,
      userAgent: refreshTokens.userAgent,
      isUsed: refreshTokens.isUsed,
    })
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.userId, user.id),
        eq(refreshTokens.isRevoked, false)
      )
    );

  reply.send({
    success: true,
    data: { sessions },
  });
}

// DELETE /api/auth/sessions/:id - Revoke specific session
export async function revokeSession(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const user = request.user!;
  const sessionId = parseInt(request.params.id, 10);

  await db
    .update(refreshTokens)
    .set({ isRevoked: true, revokedAt: new Date() })
    .where(
      and(
        eq(refreshTokens.id, sessionId),
        eq(refreshTokens.userId, user.id)
      )
    );

  reply.send({
    success: true,
    data: { message: 'Session revoked' },
  });
}
```

---

## Testing Requirements

### Unit Tests Needed

1. **Token Storage Tests**
   - Should store hashed refresh token in database
   - Should include IP address and user agent
   - Should set correct expiration time

2. **Token Rotation Tests**
   - Should mark old token as used
   - Should generate new token in same family
   - Should link old token to new token via `replacedBy`

3. **Reuse Detection Tests**
   - Should detect when used token is used again
   - Should revoke entire token family on reuse
   - Should throw specific error message

4. **Revocation Tests**
   - Should revoke single token
   - Should revoke all user tokens
   - Should revoke token family
   - Should prevent revoked token from refreshing

5. **Cleanup Tests**
   - Should delete expired and used tokens
   - Should not delete unexpired tokens
   - Should return count of deleted tokens

---

## Database Indexes Needed

Add these indexes for performance:

```sql
-- Find tokens by hash (for refresh)
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- Find user's active tokens (for sessions list)
CREATE INDEX idx_refresh_tokens_user_active
  ON refresh_tokens(user_id, is_revoked)
  WHERE is_revoked = false;

-- Find tokens by family (for reuse detection)
CREATE INDEX idx_refresh_tokens_family ON refresh_tokens(family_id);

-- Cleanup expired tokens
CREATE INDEX idx_refresh_tokens_cleanup
  ON refresh_tokens(expires_at, is_used)
  WHERE is_used = true;
```

---

## Environment Variables to Add

```env
# Token cleanup schedule (cron format)
JWT_CLEANUP_SCHEDULE=0 2 * * * # Every day at 2 AM

# Maximum active sessions per user
JWT_MAX_SESSIONS=10

# Token rotation enabled
JWT_ROTATION_ENABLED=true
```

---

## Security Best Practices

1. **Always hash tokens before storage** - Use SHA-256 minimum
2. **Implement token rotation** - Issue new refresh token on each use
3. **Detect token reuse** - Revoke family on suspicious activity
4. **Track sessions** - Store IP and User-Agent for security monitoring
5. **Cleanup expired tokens** - Run scheduled job to prevent database bloat
6. **Rate limit refresh endpoint** - Prevent brute force attacks
7. **Log security events** - Token reuse, revocations, suspicious IPs
8. **Use HTTPS only** - Never send tokens over HTTP
9. **Short access token lifetime** - 15 minutes is good
10. **Limit concurrent sessions** - Max 10 devices per user

---

## Implementation Priority

1. ✅ **Phase 1 (HIGH):** Token storage + basic validation
2. ✅ **Phase 2 (HIGH):** Token rotation + reuse detection
3. ✅ **Phase 3 (HIGH):** Server-side logout
4. ⚠️ **Phase 4 (MEDIUM):** Session management UI
5. ⚠️ **Phase 5 (MEDIUM):** Token cleanup cron job
6. ⚠️ **Phase 6 (LOW):** Advanced monitoring and alerts

---

## Migration Path

Since the `refresh_tokens` table already exists, you can implement these changes incrementally:

1. Start storing new tokens in database (don't validate yet)
2. Add validation for new tokens (old tokens still work)
3. Force re-authentication for all users (clear old tokens)
4. Fully enforce database validation

This allows zero-downtime migration.

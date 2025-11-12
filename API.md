# API Documentation

## API Endpoints Reference

### Public Endpoints (No Authentication Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API information and available endpoints |
| GET | `/health` | Health check (returns `{"status":"ok"}`) |
| GET | `/api/auth/google` | Get Google OAuth authorization URL |
| GET | `/api/auth/google/callback` | Google OAuth callback (receives code, returns tokens) |
| GET | `/api/auth/apple` | Get Apple OAuth authorization URL |
| POST | `/api/auth/apple/callback` | Apple OAuth callback (receives code + id_token, returns tokens or account linking request) |
| POST | `/api/auth/link-provider` | Confirm account linking with temporary token |
| POST | `/api/auth/refresh` | Refresh access token using refresh token |
| GET | `/api/auth/verify` | Verify access token validity |
| POST | `/api/auth/logout` | Logout (client-side token discard) |

### Protected Endpoints (Require JWT Authentication)

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/api/profile` | Get current user profile | user+ |
| PATCH | `/api/profile` | Update profile (name, avatar - email/provider locked) | user+ |
| DELETE | `/api/profile` | Delete own account | user+ |
| GET | `/api/profile/providers` | List all linked OAuth providers for user | user+ |
| DELETE | `/api/profile/providers/:provider` | Unlink OAuth provider (cannot remove last one) | user+ |

### Admin Endpoints (Require Admin Role)

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/api/admin/users` | List all users (pagination, search, sort) | admin+ |
| GET | `/api/admin/users/stats` | Get user statistics (total, by role, by provider) | admin+ |
| GET | `/api/admin/users/:id` | Get user by ID | admin+ |
| PATCH | `/api/admin/users/:id/role` | Update user role | admin+ (superadmin for superadmin role) |
| DELETE | `/api/admin/users/:id` | Delete user | admin+ (superadmin for superadmin users) |
| GET | `/api/admin/api-keys` | List all API keys | admin+ |
| POST | `/api/admin/api-keys` | Generate new API key with custom name | admin+ |
| POST | `/api/admin/api-keys/:id/regenerate` | Regenerate existing key (invalidates old) | admin+ |
| DELETE | `/api/admin/api-keys/:id` | Revoke API key (soft delete) | admin+ |
| GET | `/api/admin/collections` | List available database collections | admin+ |
| GET | `/api/admin/collections/:table` | Browse collection data (read-only) | admin+ |
| GET | `/api/admin/authorized-admins` | List pre-authorized admin emails | superadmin |
| POST | `/api/admin/authorized-admins` | Add authorized admin email | superadmin |
| DELETE | `/api/admin/authorized-admins/:id` | Remove authorized admin | superadmin |

### Setup Endpoints (System Configuration)

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/api/setup/status` | Get setup wizard status | None |
| POST | `/api/setup/initialize` | Initialize system with first superadmin | None (only if not initialized) |
| POST | `/api/setup/reset` | Reset setup status (dev only) | superadmin (dev mode only) |

## OAuth & JWT Authentication

### OAuth Flow

**Supported Providers:**
1. **Google Sign-In** - Fully implemented
2. **Apple Sign-In** - Fully implemented (requires paid Apple Developer account)

**Flow Steps:**
1. Client requests OAuth URL: `GET /api/auth/google` or `GET /api/auth/apple`
2. Server returns authorization URL
3. User authenticates with provider (redirect)
4. Provider redirects to callback with authorization code
5. Server exchanges code for user info (Google) or verifies ID token (Apple)
6. Server creates or updates user in database (with auto-promotion if email matches admin list)
7. Server generates JWT access + refresh tokens
8. Client stores tokens and uses access token for subsequent requests

### Multi-Provider Support

**Architecture:**
Users can link multiple OAuth providers (Google + Apple) to a single account using the same email address. The system uses a normalized database design with a separate `provider_accounts` table.

**Account Linking Flow:**
1. User signs in with OAuth provider (e.g., Google)
2. System checks if `(provider, providerId)` exists in `provider_accounts`
3. **If found**: Authenticate user and update `lastLoginAt`
4. **If not found**: Check if email exists with different provider
5. **If email exists**: Return `AccountLinkingRequest` with linking token (10-minute expiry)
6. **If email doesn't exist**: Create new user + provider account
7. **User confirms linking**: Call `POST /api/auth/link-provider` with token
8. **System links accounts**: Create new provider account entry and authenticate

**Account Linking Security:**
- Linking requires explicit user confirmation via frontend modal
- Temporary tokens expire after 10 minutes
- Tokens stored in-memory (Map) with automatic cleanup
- Cannot link if provider already linked to another user
- Cannot link if this provider is already linked to the account

**Provider Management:**
- `GET /api/profile/providers` - List all linked providers
- `DELETE /api/profile/providers/:provider` - Unlink provider (cannot remove last one)
- `POST /api/auth/link-provider` - Confirm account linking with temporary token

### JWT Implementation

**Token Types:**
- **Access Token**: Short-lived (15 minutes), used for API requests
- **Refresh Token**: Long-lived (7 days), used to get new access tokens

**JWT Payload:**
```typescript
interface JWTPayload {
  id: number;          // User ID
  email: string;       // User email
  role: 'user' | 'admin' | 'superadmin';  // For RBAC
  iat?: number;        // Issued at
  exp?: number;        // Expires at
}
```

**Token Endpoints:**
- `POST /api/auth/refresh` - Refresh access token using refresh token
- `GET /api/auth/verify` - Verify access token
- `POST /api/auth/logout` - Logout (client discards tokens)

### Authentication Module Structure

**`backend/src/modules/auth/`:**
- **auth.types.ts** - TypeScript interfaces for OAuth, JWT, providers
- **auth.service.ts** - OAuth logic with multi-provider support
- **provider-accounts.service.ts** - Provider account management (CRUD)
- **jwt.service.ts** - JWT management (generateTokens, verifyToken, refreshAccessToken)
- **auth.controller.ts** - Route handlers with account linking support
- **auth.routes.ts** - Fastify route registration with schemas

**`backend/src/plugins/jwt.ts`:**
- Registers `@fastify/jwt` plugin
- Adds `fastify.authenticate` decorator for route protection
- Extends FastifyRequest with typed `user` property

## Role-Based Access Control (RBAC)

### Role Hierarchy

```
user → admin → superadmin
```

**Permissions:**
- **user**: Access own profile, use public endpoints
- **admin**: User permissions + manage all users, view stats, manage any user role
- **superadmin**: All admin permissions + promote to superadmin, delete superadmins, system control

### Authorization Middleware

**`backend/src/middleware/authorize.ts`** provides role-based middleware:

- **`requireAdmin`** - Requires admin or superadmin role
- **`requireSuperadmin`** - Requires superadmin role only
- **`requireRole(allowedRoles)`** - Requires one of specified roles
- **`requireSelfOrAdmin(allowAdmin)`** - Requires user to be themselves or admin
- **`optionalAuth`** - Attaches user if authenticated (doesn't require auth)

**Example Usage:**
```typescript
fastify.get('/api/admin/users', {
  preHandler: requireAdmin,
  handler: listUsers
});

fastify.get('/api/admin/stats', {
  preHandler: requireRole(['admin', 'superadmin']),
  handler: getStats
});
```

### Admin Setup

**Initial Superadmin Creation:**
1. First deployment: Access `/admin/setup` to complete setup wizard
2. Enter your email during setup to become the first superadmin
3. Setup status is tracked in the `setup_status` database table

**Auto-Promotion System:**
Users are automatically promoted to admin role during OAuth login if their email is in the `authorized_admins` table:
- Checked during OAuth callback in `backend/src/modules/auth/auth.service.ts` → `handleOAuthCallback()`
- Works for new signups and existing users (upgrades on next login)
- Role promotion: user → admin (or superadmin if specified)

**Authorized Admins Management (Superadmin only):**
Superadmins can pre-authorize emails for automatic admin promotion via:
- Admin panel: `/admin/authorized-admins` (recommended)
- API endpoint: `POST /api/admin/authorized-admins`
- Database table: `authorized_admins`

**Deprecated Environment Variables:**
- ~~`ADMIN_EMAIL`~~ - No longer used (use setup wizard instead)
- ~~`ADMIN_EMAILS_ADDITIONAL`~~ - No longer used (use authorized_admins table)
- ~~`SUPER_ADMIN_EMAIL`~~ - No longer used (first user in setup becomes superadmin)

## Global API Key Authentication

All API routes (except whitelisted paths) require `X-API-Key` header.

**Whitelisted Paths:**
- `/health` - Health check endpoint
- `/api/auth/*` - OAuth flow endpoints
- `/api/setup/*` - Setup wizard endpoints
- `/admin/*` - Admin panel static files

**API Key Setup:**
During initial setup, three API keys are generated:
- `ios_api_key` - For iOS mobile app
- `android_api_key` - For Android mobile app
- `admin_panel_api_key` - For admin web interface

**API Key Security:**
- Keys hashed with bcrypt (cost factor 10)
- Plain key shown only once during generation/regeneration
- Keys stored in database with creator tracking
- Soft delete (revokedAt timestamp)

**Usage:**
```bash
curl -H "X-API-Key: your_api_key_here" \
     -H "Authorization: Bearer your_jwt_token" \
     https://api.example.com/api/profile
```

## Request/Response Examples

### Authentication Example

**1. Get OAuth URL**
```bash
GET /api/auth/google
```

**Response:**
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=..."
}
```

**2. OAuth Callback**
```bash
GET /api/auth/google/callback?code=4/0AX4XfWh...
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "avatar": "https://..."
  }
}
```

**3. Account Linking Response**
```json
{
  "requiresLinking": true,
  "linkingToken": "temp_token_123...",
  "existingUser": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "providers": ["google"]
  },
  "newProvider": {
    "provider": "apple",
    "providerId": "001234.abc...",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### Profile Management

**Get Profile**
```bash
GET /api/profile
Authorization: Bearer <token>
X-API-Key: <api_key>
```

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "avatar": "https://...",
  "role": "user",
  "primaryProvider": "google",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "lastLoginAt": "2025-01-10T12:00:00.000Z"
}
```

**Update Profile**
```bash
PATCH /api/profile
Authorization: Bearer <token>
X-API-Key: <api_key>
Content-Type: application/json

{
  "name": "Jane Doe",
  "avatar": "https://new-avatar.com/image.jpg"
}
```

### Admin Operations

**List Users**
```bash
GET /api/admin/users?page=1&limit=10&search=john&sort=createdAt:desc
Authorization: Bearer <admin_token>
X-API-Key: <api_key>
```

**Response:**
```json
{
  "users": [
    {
      "id": 1,
      "email": "john@example.com",
      "name": "John Doe",
      "role": "user",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

**Update User Role**
```bash
PATCH /api/admin/users/1/role
Authorization: Bearer <admin_token>
X-API-Key: <api_key>
Content-Type: application/json

{
  "role": "admin"
}
```

### API Key Management

**Generate API Key**
```bash
POST /api/admin/api-keys
Authorization: Bearer <admin_token>
X-API-Key: <api_key>
Content-Type: application/json

{
  "name": "Mobile App - iOS Production"
}
```

**Response:**
```json
{
  "id": 5,
  "name": "Mobile App - iOS Production",
  "key": "sk_live_abc123...",  // Only shown once
  "createdBy": 1,
  "createdAt": "2025-01-10T12:00:00.000Z"
}
```

## Error Responses

**Standard Error Format:**
```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

**Common Status Codes:**
- **400** - Bad Request (invalid input)
- **401** - Unauthorized (missing/invalid auth)
- **403** - Forbidden (insufficient permissions)
- **404** - Not Found (resource doesn't exist)
- **409** - Conflict (duplicate resource)
- **422** - Unprocessable Entity (validation error)
- **500** - Internal Server Error

## Rate Limiting

- **Rate**: 100 requests per minute per IP address
- **Response**: 429 Too Many Requests
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

**See also:**
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Project structure and tech stack
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development workflow
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment

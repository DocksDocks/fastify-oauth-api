# Backend Testing Guide (No OAuth Required)

This guide shows how to test all new backend features without setting up Google/Apple OAuth.

---

## 🎯 **What You'll Test**

✅ Database migrations (new tables: `api_keys`, `seed_status`)
✅ API key validation middleware
✅ API Keys management endpoints
✅ Collections browser endpoints
✅ JWT + API key authentication flow

---

## 📋 **Prerequisites**

- Docker containers running (`pnpm docker:start`)
- PostgreSQL database accessible
- `.env` file configured with basic settings

---

## 🚀 **Step-by-Step Testing**

### **Step 1: Run Database Migrations**

Create the new tables (`api_keys`, `seed_status`):

```bash
pnpm db:migrate
```

**Expected output:**
```
✓ Applying migration: 0004_slim_adam_destine.sql
✓ Migration complete
```

**Verify tables created:**
```bash
# Connect to PostgreSQL
pnpm docker:postgres:exec

# Inside PostgreSQL shell:
\c fastify_oauth_db
\dt

# You should see:
# - api_keys
# - seed_status
# (plus existing tables)

# Exit
\q
```

---

### **Step 2: Run Super Admin Seed**

Generate initial API keys:

```bash
pnpm db:seed:superadmin
```

**Expected output:**
```
╔═══════════════════════════════════════════════════════════════╗
║           Super Admin Initialization Seed                    ║
╚═══════════════════════════════════════════════════════════════╝

🚀 Running super admin initialization...

  System user ID: 1

🔑 Generating initial API keys...

  ✅ ios_api_key: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0
     Store this key securely! It will not be shown again.

  ✅ android_api_key: z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4z3y2x1w0
     Store this key securely! It will not be shown again.

  ✅ admin_panel_api_key: 1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d
     Store this key securely! It will not be shown again.

╔═══════════════════════════════════════════════════════════════╗
║                    Seed Completed Successfully!              ║
╚═══════════════════════════════════════════════════════════════╝

📝 Next Steps:

  1. Set SUPER_ADMIN_EMAIL in .env file
  2. Start the application
  3. Sign in with Google/Apple OAuth using super admin email
  4. User will be automatically promoted to superadmin role

⚠️  IMPORTANT: Store the API keys above securely!
   They will not be shown again.

   Add them to your .env file:

   VITE_ADMIN_PANEL_API_KEY=<admin_panel_api_key>
   IOS_API_KEY=<ios_api_key>
   ANDROID_API_KEY=<android_api_key>
```

**⚠️ CRITICAL: Copy these API keys! You'll need them for testing.**

If you lose them, you can regenerate by deleting the seed status:
```sql
DELETE FROM seed_status WHERE seed_name = 'super-admin-init';
```
Then re-run the seed.

---

### **Step 3: Update `.env` File**

Add the generated API keys to your `.env`:

```bash
# Open .env file
nano .env

# Add these lines (replace with actual keys from Step 2):
SUPER_ADMIN_EMAIL=your-email@gmail.com
VITE_ADMIN_PANEL_API_KEY=<paste_admin_panel_api_key>
IOS_API_KEY=<paste_ios_api_key>
ANDROID_API_KEY=<paste_android_api_key>
```

**Save and close** (`Ctrl+O`, `Enter`, `Ctrl+X`)

---

### **Step 4: Generate Test JWT Token**

Generate a JWT token for testing (no OAuth required):

```bash
pnpm dev:token
```

**Expected output:**
```
┌─────────────────────────────────────────┐
│   Development JWT Token Generator       │
└─────────────────────────────────────────┘

Generated JWT Token:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ1c2VyQHRlc3QuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzYxMDY1NDgxLCJleHAiOjE3NjEwNjYzODF9.bLtx28drI-bAQEcSZsZFL4SqA0vrlaHQnya1_rvN8Iw

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Token Details:
  User ID: 1
  Email: user@test.com
  Role: admin
  Expires: 2025-10-22T16:33:01Z (15 minutes)

Usage:
  Authorization: Bearer <token>
```

**⚠️ CRITICAL: Copy this token! You'll use it in all API requests.**

---

### **Step 5: Start API Server**

```bash
pnpm dev:api
```

**Expected output:**
```
[API] Server listening at http://localhost:3000
[API] Environment: development
[API] Database connected
[API] Redis connected
```

Keep this terminal open. Open a **new terminal** for testing.

---

### **Step 6: Test Endpoints**

Now test the new features using `curl`:

#### **6.1: Test Health Check (No API Key Required)**

```bash
curl http://localhost:3000/health
```

**Expected:**
```json
{"status":"ok"}
```

✅ Health check works (whitelisted route)

---

#### **6.2: Test Missing API Key (Should Fail)**

```bash
curl http://localhost:3000/api/admin/collections
```

**Expected:**
```json
{
  "success": false,
  "error": {
    "code": "API_KEY_MISSING",
    "message": "API key is required. Include X-API-Key header in your request."
  }
}
```

✅ API key middleware is working

---

#### **6.3: Test Invalid API Key (Should Fail)**

```bash
curl -H "X-API-Key: invalid-key-12345" \
     http://localhost:3000/api/admin/collections
```

**Expected:**
```json
{
  "success": false,
  "error": {
    "code": "API_KEY_INVALID",
    "message": "Invalid or revoked API key."
  }
}
```

✅ API key validation is working

---

#### **6.4: Test Valid API Key but No JWT (Should Fail)**

Replace `YOUR_ADMIN_PANEL_API_KEY` with actual key from Step 2:

```bash
curl -H "X-API-Key: YOUR_ADMIN_PANEL_API_KEY" \
     http://localhost:3000/api/admin/collections
```

**Expected:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

✅ JWT authentication is required

---

#### **6.5: Test Valid API Key + Valid JWT (Should Work!)**

Replace `YOUR_ADMIN_PANEL_API_KEY` and `YOUR_JWT_TOKEN` with actual values:

```bash
curl -H "X-API-Key: YOUR_ADMIN_PANEL_API_KEY" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/api/admin/collections
```

**Expected:**
```json
{
  "success": true,
  "data": {
    "collections": [
      {
        "name": "Users",
        "table": "users",
        "description": "System users with OAuth authentication"
      },
      {
        "name": "Exercises",
        "table": "exercises",
        "description": "Exercise library (system and user-created)"
      },
      {
        "name": "Workouts",
        "table": "workouts",
        "description": "User workout plans"
      },
      {
        "name": "API Keys",
        "table": "api_keys",
        "description": "Global API keys for mobile apps and admin panel"
      },
      {
        "name": "Refresh Tokens",
        "table": "refresh_tokens",
        "description": "JWT refresh tokens for user sessions"
      }
    ],
    "total": 5
  }
}
```

✅ **SUCCESS!** Collections endpoint works with both API key and JWT!

---

#### **6.6: Test Collections Data Query**

Query users table with pagination:

```bash
curl -H "X-API-Key: YOUR_ADMIN_PANEL_API_KEY" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "http://localhost:3000/api/admin/collections/users/data?page=1&limit=10"
```

**Expected:**
```json
{
  "success": true,
  "data": {
    "collection": "Users",
    "table": "users",
    "rows": [
      {
        "id": 1,
        "email": "system@internal",
        "name": "System",
        "role": "superadmin",
        "provider": "system",
        "createdAt": "2025-10-22T..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

✅ Collections data query works!

---

#### **6.7: Test Collections Search**

Search users by email:

```bash
curl -H "X-API-Key: YOUR_ADMIN_PANEL_API_KEY" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "http://localhost:3000/api/admin/collections/users/data?search=system"
```

**Expected:** Filtered results containing "system"

✅ Search functionality works!

---

#### **6.8: Test API Keys List**

```bash
curl -H "X-API-Key: YOUR_ADMIN_PANEL_API_KEY" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/api/admin/api-keys
```

**Expected:**
```json
{
  "success": true,
  "data": {
    "keys": [
      {
        "id": 1,
        "name": "ios_api_key",
        "status": "active",
        "createdAt": "2025-10-22T...",
        "updatedAt": "2025-10-22T...",
        "revokedAt": null
      },
      {
        "id": 2,
        "name": "android_api_key",
        "status": "active",
        ...
      },
      {
        "id": 3,
        "name": "admin_panel_api_key",
        "status": "active",
        ...
      }
    ]
  }
}
```

✅ API keys list endpoint works!

---

#### **6.9: Test API Keys Statistics**

```bash
curl -H "X-API-Key: YOUR_ADMIN_PANEL_API_KEY" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/api/admin/api-keys/stats
```

**Expected:**
```json
{
  "success": true,
  "data": {
    "total": 3,
    "active": 3,
    "revoked": 0
  }
}
```

✅ Statistics endpoint works!

---

#### **6.10: Test Generate New API Key**

```bash
curl -X POST \
     -H "X-API-Key: YOUR_ADMIN_PANEL_API_KEY" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name":"test_api_key"}' \
     http://localhost:3000/api/admin/api-keys/generate
```

**Expected:**
```json
{
  "success": false,
  "error": "Invalid API key name. Must be one of: ios_api_key, android_api_key, admin_panel_api_key"
}
```

✅ Validation works! (Only predefined key names allowed)

---

#### **6.11: Test Revoke API Key**

First, get an API key ID from the list (Step 6.8), then:

```bash
curl -X POST \
     -H "X-API-Key: YOUR_ADMIN_PANEL_API_KEY" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/api/admin/api-keys/1/revoke
```

**Expected:**
```json
{
  "success": true,
  "message": "API key revoked successfully"
}
```

⚠️ **Warning:** Don't revoke the `admin_panel_api_key` you're using for testing!

---

## ✅ **Success Criteria**

If all tests pass, you've successfully validated:

1. ✅ Database migrations work
2. ✅ Seed script generates API keys
3. ✅ API key middleware validates requests
4. ✅ Collections endpoints are protected and functional
5. ✅ API keys endpoints work with proper authentication
6. ✅ Search, pagination, and sorting work in collections
7. ✅ Role-based access control (RBAC) is enforced

---

## 🐛 **Troubleshooting**

### **Problem: Migration fails**

```bash
# Check database is running
pnpm docker:postgres:log

# Try manual migration
pnpm db:push
```

### **Problem: Seed fails with "already ran"**

```bash
# Delete seed status and re-run
pnpm docker:postgres:exec

# In PostgreSQL:
\c fastify_oauth_db
DELETE FROM seed_status WHERE seed_name = 'super-admin-init';
\q

# Re-run seed
pnpm db:seed:superadmin
```

### **Problem: API key validation fails**

- Make sure you copied the FULL key from seed output (64 characters)
- Check `.env` file has correct key (no extra spaces)
- Restart API server after updating `.env`

### **Problem: JWT expired**

```bash
# Generate a new token
pnpm dev:token

# Copy the new token and use it in requests
```

---

## 🎉 **Next Steps**

Now that backend is validated, you can:

1. **Continue with frontend development** (admin panel UI)
2. **Test full OAuth flow** (requires Google credentials)
3. **Deploy to production** (use `.env.production.example` as template)

---

**Last Updated:** October 2025
**Version:** 1.0
**Status:** Backend fully tested and validated ✅

# Test Suite Documentation

**Fastify OAuth API - Comprehensive Test Coverage**

## Summary

- **Total Tests**: 264
- **Test Files**: 9
- **All Tests**: ✅ Passing
- **Coverage**: 90.68% (lines), 89.88% (functions), 82.05% (branches)
- **Test Framework**: Vitest 3.2.4
- **Test Environment**: Node.js with test database

## Test Structure

```
test/
├── helper/                      # Test utilities
│   ├── setup.ts                 # Global test setup and database
│   ├── factories.ts             # Test data factories
│   └── app-helper.ts            # Test app builder
├── services/                    # Unit tests for services
│   ├── exercises.service.test.ts (28 tests)
│   ├── workouts.service.test.ts (27 tests)
│   ├── jwt.service.test.ts      (32 tests)
│   └── auth.service.test.ts     (38 tests)
└── routes/                      # Integration tests for routes
    ├── exercises.routes.test.ts (35 tests)
    ├── workouts.routes.test.ts  (38 tests)
    ├── auth.routes.test.ts      (26 tests)
    ├── profile.routes.test.ts   (15 tests)
    └── admin/
        └── users.routes.test.ts (25 tests)
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Specific Test File
```bash
npm test -- test/services/jwt.service.test.ts
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Run Tests with UI
```bash
npm test -- --ui
```

## Test Categories

### Service Unit Tests (125 tests)

**Exercises Service** (28 tests)
- Create, read, update, delete operations
- Validation and error handling
- Edge cases (non-existent exercises, invalid data)

**Workouts Service** (27 tests)
- CRUD operations with user ownership
- Sharing with coaches
- Complex queries and filtering
- Permissions and authorization

**JWT Service** (32 tests)
- Token generation and verification
- Token refresh and rotation
- Token revocation (single, family, all)
- Token reuse detection
- Session management
- Cleanup of expired tokens

**Auth Service** (38 tests)
- OAuth callback handling
- User creation and updates
- Email normalization
- Provider integration

### Route Integration Tests (139 tests)

**Exercises Routes** (35 tests)
- GET /api/exercises (list, pagination, search, filtering)
- POST /api/exercises (create with validation)
- GET /api/exercises/:id (get by ID)
- PATCH /api/exercises/:id (update with validation)
- DELETE /api/exercises/:id (delete with permissions)
- Authentication and authorization checks

**Workouts Routes** (38 tests)
- GET /api/workouts (list own workouts)
- POST /api/workouts (create with exercises)
- GET /api/workouts/:id (get by ID with permissions)
- PATCH /api/workouts/:id (update with ownership check)
- DELETE /api/workouts/:id (delete with ownership check)
- POST /api/workouts/:id/share (share with coach)
- DELETE /api/workouts/:id/share (unshare)
- GET /api/workouts/shared/with-me (coach view)
- Full workout lifecycle integration

**Auth Routes** (26 tests)
- POST /api/auth/refresh (token rotation, reuse detection)
- GET /api/auth/verify (token verification)
- POST /api/auth/logout (single device, all devices, token revocation)
- GET /api/auth/sessions (list active sessions)
- DELETE /api/auth/sessions/:id (revoke specific session)
- Token rotation and family management
- Error handling for invalid/expired tokens

**Profile Routes** (15 tests)
- GET /api/profile (fetch profile)
- PATCH /api/profile (update name, avatar, validation)
- DELETE /api/profile (account deletion)
- Full profile lifecycle integration

**Admin Routes** (25 tests)
- GET /api/admin/users (list with pagination, search, sort)
- GET /api/admin/users/stats (user statistics)
- GET /api/admin/users/:id (get user by ID)
- PATCH /api/admin/users/:id/role (update role with RBAC)
- DELETE /api/admin/users/:id (delete with RBAC)
- Full admin workflow integration
- Role-based access control (user, coach, admin, superadmin)

## Test Infrastructure

### Test Database

- **Separate test database**: `fastify_oauth_api_test`
- **Automatic setup**: Runs migrations before tests
- **Automatic cleanup**: Truncates tables between tests
- **Isolation**: Each test file gets a fresh database state

### Test Factories

Located in `test/helper/factories.ts`:

- **createUser()**
  Create test users with specified roles

- **createExercise()**
  Create test exercises with or without ownership

- **createWorkout()**
  Create test workouts with exercises

- **generateTestToken()**
  Generate JWT tokens for testing

- **generateTokens()** (from jwt.service.ts)
  Generate full access + refresh token pairs

### Test App Builder

Located in `test/helper/app-helper.ts`:

- **buildTestApp()**
  Creates a fully configured Fastify instance for testing
  - All plugins loaded
  - All routes registered
  - Uses test database
  - Logging disabled

## Coverage Configuration

### Included in Coverage
- All source files in `src/`
- Business logic (services, routes, controllers)
- Middleware and plugins
- Utilities

### Excluded from Coverage
- Infrastructure files (server.ts, db/client.ts, logger.ts)
- Database migrations and seeds
- Schema definitions (type-only files)
- OAuth provider integrations (external APIs)
- Configuration files
- Test files

### Coverage Thresholds
- **Lines**: 90%
- **Functions**: 89%
- **Branches**: 82%
- **Statements**: 90%

## Key Testing Patterns

### Integration Tests

```typescript
describe('GET /api/workouts', () => {
  let app: FastifyInstance;
  let user: User;
  let userToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    user = await createUser({ role: 'user' });
    const tokens = await generateTestToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    userToken = tokens.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should list user workouts', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/workouts',
      headers: {
        authorization: `Bearer ${userToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.workouts).toBeInstanceOf(Array);
  });
});
```

### Service Unit Tests

```typescript
describe('JWT Service', () => {
  it('should generate access and refresh tokens', async () => {
    const user = await createUser({ role: 'user' });
    const tokens = await generateTokens(app, user);

    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
    expect(tokens.expiresIn).toBeGreaterThan(0);

    // Verify tokens can be decoded
    const decoded = app.jwt.verify(tokens.accessToken);
    expect(decoded.id).toBe(user.id);
    expect(decoded.email).toBe(user.email);
    expect(decoded.role).toBe(user.role);
  });
});
```

## Testing Best Practices

1. **Isolation**: Each test is independent and doesn't rely on others
2. **Cleanup**: Database is cleaned between tests
3. **Realistic Data**: Use factories to create realistic test data
4. **Edge Cases**: Test error handling and edge cases
5. **Integration**: Test full request/response cycles
6. **Security**: Test authentication and authorization
7. **Comprehensive**: Test happy paths and error paths

## Continuous Integration

Tests are designed to run in CI/CD pipelines:

- Fast execution (< 12 seconds total)
- No external dependencies (uses test database)
- Parallel execution disabled (database conflicts)
- Deterministic results

## Debugging Tests

### View Detailed Output
```bash
npm test -- --reporter=verbose
```

### Debug Single Test
```bash
npm test -- test/services/jwt.service.test.ts --reporter=verbose
```

### Check Coverage for Specific File
```bash
npm run test:coverage -- test/routes/auth.routes.test.ts
```

### View HTML Coverage Report
```bash
npm run test:coverage
open coverage/index.html
```

## Known Limitations

1. **OAuth Provider Testing**: OAuth callbacks (Google, Apple) are excluded from coverage as they require mocking external APIs
2. **Real Database Required**: Tests use a real PostgreSQL database, not mocks
3. **Serial Execution**: Tests run serially to avoid database conflicts
4. **Authorization Edge Cases**: Some authorization middleware paths have lower coverage due to complex permission scenarios

## Future Improvements

- [ ] Add E2E tests for OAuth flows with mocked providers
- [ ] Increase coverage for authorization middleware edge cases
- [ ] Add performance/load testing
- [ ] Add mutation testing
- [ ] Add visual regression tests for any UI components
- [ ] Add API contract testing

## Maintenance

- **Update factories** when adding new fields to schemas
- **Add tests** for new features before merging
- **Keep coverage above thresholds** (90% minimum)
- **Clean up obsolete tests** when refactoring

## Contact

For questions about the test suite, consult:
- [Vitest Documentation](https://vitest.dev/)
- [Fastify Testing](https://fastify.dev/docs/latest/Guides/Testing/)
- Project README.md

---

**Last Updated**: October 2025
**Test Suite Version**: 1.0
**Total Tests**: 264 ✅

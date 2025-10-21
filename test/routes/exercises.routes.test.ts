import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildTestApp } from '../helper/app-helper';
import { createUser, createExercise } from '../helper/factories';
import { generateTestToken } from '../helper/factories';
import type { FastifyInstance } from 'fastify';
import type { User } from '@/db/schema/users';
import '../helper/setup';

describe('Exercises Routes', () => {
  let app: FastifyInstance;
  let user: User;
  let admin: User;
  let userToken: string;
  let adminToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    // Create test users
    user = await createUser({ email: `user-${Date.now()}@test.com`, role: 'user' });
    admin = await createUser({ email: `admin-${Date.now()}@test.com`, role: 'admin' });

    // Generate tokens
    const userTokens = await generateTestToken({ id: user.id, email: user.email, role: user.role });
    const adminTokens = await generateTestToken({ id: admin.id, email: admin.email, role: admin.role });

    userToken = userTokens.accessToken;
    adminToken = adminTokens.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/exercises', () => {
    it('should list all public exercises when not authenticated', async () => {
      await createExercise({ code: 'PUBLIC_BENCH', name: 'Bench Press', isPublic: true });
      await createExercise({ code: 'CUSTOM_CURL', name: 'Custom Curl', isPublic: false, createdBy: user.id });

      const response = await app.inject({
        method: 'GET',
        url: '/api/exercises',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.exercises).toHaveLength(1);
      expect(body.data.exercises[0].code).toBe('PUBLIC_BENCH');
      expect(body.data.pagination).toHaveProperty('page');
      expect(body.data.pagination).toHaveProperty('total');
    });

    it('should list public and own custom exercises when authenticated', async () => {
      await createExercise({ code: 'PUBLIC_SQUAT', name: 'Squat', isPublic: true });
      await createExercise({ code: 'MY_CUSTOM', name: 'My Custom', isPublic: false, createdBy: user.id });
      await createExercise({ code: 'OTHER_CUSTOM', name: 'Other Custom', isPublic: false, createdBy: admin.id });

      const response = await app.inject({
        method: 'GET',
        url: '/api/exercises',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.exercises).toHaveLength(2);
      const codes = body.data.exercises.map((e: any) => e.code);
      expect(codes).toContain('PUBLIC_SQUAT');
      expect(codes).toContain('MY_CUSTOM');
      expect(codes).not.toContain('OTHER_CUSTOM');
    });

    it('should filter exercises by category', async () => {
      await createExercise({ code: 'STRENGTH_1', name: 'Strength Ex', category: 'strength', isPublic: true });
      await createExercise({ code: 'CARDIO_1', name: 'Cardio Ex', category: 'cardio', isPublic: true });

      const response = await app.inject({
        method: 'GET',
        url: '/api/exercises?category=strength',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.exercises).toHaveLength(1);
      expect(body.data.exercises[0].category).toBe('strength');
    });

    it('should filter exercises by muscle group', async () => {
      await createExercise({ code: 'CHEST_1', name: 'Chest Ex', muscleGroup: 'chest', isPublic: true });
      await createExercise({ code: 'BACK_1', name: 'Back Ex', muscleGroup: 'back', isPublic: true });

      const response = await app.inject({
        method: 'GET',
        url: '/api/exercises?muscleGroup=chest',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.exercises).toHaveLength(1);
      expect(body.data.exercises[0].muscleGroup).toBe('chest');
    });

    it('should search exercises by name', async () => {
      await createExercise({ code: 'BENCH_PRESS', name: 'Bench Press', isPublic: true });
      await createExercise({ code: 'LEG_PRESS', name: 'Leg Press', isPublic: true });

      const response = await app.inject({
        method: 'GET',
        url: '/api/exercises?search=bench',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.exercises).toHaveLength(1);
      expect(body.data.exercises[0].name).toBe('Bench Press');
    });

    it('should paginate exercises', async () => {
      for (let i = 1; i <= 25; i++) {
        await createExercise({ code: `EXERCISE_${i}`, name: `Exercise ${i}`, isPublic: true });
      }

      const response = await app.inject({
        method: 'GET',
        url: '/api/exercises?page=2&limit=10',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.exercises).toHaveLength(10);
      expect(body.data.pagination.page).toBe(2);
      expect(body.data.pagination.limit).toBe(10);
      expect(body.data.pagination.totalPages).toBe(3);
    });

    it('should only show public exercises when onlyPublic=true', async () => {
      await createExercise({ code: 'PUBLIC_1', name: 'Public Ex', isPublic: true });
      await createExercise({ code: 'MY_CUSTOM_1', name: 'My Custom', isPublic: false, createdBy: user.id });

      const response = await app.inject({
        method: 'GET',
        url: '/api/exercises?onlyPublic=true',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.exercises).toHaveLength(1);
      expect(body.data.exercises[0].code).toBe('PUBLIC_1');
    });
  });

  describe('GET /api/exercises/:code', () => {
    it('should get public exercise by code without auth', async () => {
      await createExercise({ code: 'DEADLIFT', name: 'Deadlift', isPublic: true });

      const response = await app.inject({
        method: 'GET',
        url: '/api/exercises/DEADLIFT',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.code).toBe('DEADLIFT');
      expect(body.data.name).toBe('Deadlift');
    });

    it('should not get custom exercise by code without auth', async () => {
      await createExercise({ code: 'MY_CUSTOM_EX', name: 'My Custom', isPublic: false, createdBy: user.id });

      const response = await app.inject({
        method: 'GET',
        url: '/api/exercises/MY_CUSTOM_EX',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should get own custom exercise by code with auth', async () => {
      await createExercise({ code: 'MY_CUSTOM_EX', name: 'My Custom', isPublic: false, createdBy: user.id });

      const response = await app.inject({
        method: 'GET',
        url: '/api/exercises/MY_CUSTOM_EX',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.code).toBe('MY_CUSTOM_EX');
    });

    it('should return 404 for non-existent exercise', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/exercises/NON_EXISTENT',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('GET /api/exercises/id/:id', () => {
    it('should get public exercise by ID without auth', async () => {
      const exercise = await createExercise({ code: 'OVERHEAD_PRESS', name: 'Overhead Press', isPublic: true });

      const response = await app.inject({
        method: 'GET',
        url: `/api/exercises/id/${exercise.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(exercise.id);
      expect(body.data.name).toBe('Overhead Press');
    });

    it('should not get custom exercise by ID without auth', async () => {
      const exercise = await createExercise({ code: 'CUSTOM_ID', name: 'Custom', isPublic: false, createdBy: user.id });

      const response = await app.inject({
        method: 'GET',
        url: `/api/exercises/id/${exercise.id}`,
      });

      expect(response.statusCode).toBe(404);
    });

    it('should get own custom exercise by ID with auth', async () => {
      const exercise = await createExercise({ code: 'CUSTOM_ID', name: 'Custom', isPublic: false, createdBy: user.id });

      const response = await app.inject({
        method: 'GET',
        url: `/api/exercises/id/${exercise.id}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(exercise.id);
    });

    it('should return 500 for invalid ID format (no schema validation)', async () => {
      // Note: ID param is type: string in schema, so parseInt("invalid") = NaN causes DB error
      const response = await app.inject({
        method: 'GET',
        url: '/api/exercises/id/invalid',
      });

      expect(response.statusCode).toBe(500);
    });
  });

  describe('POST /api/exercises', () => {
    it('should create custom exercise when authenticated', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/exercises',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          code: 'MY_NEW_EXERCISE',
          name: 'My New Exercise',
          description: 'A custom exercise',
          category: 'strength',
          muscleGroup: 'chest',
          equipment: 'Dumbbells',
          instructions: '1. Step one\n2. Step two',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.code).toBe('MY_NEW_EXERCISE');
      expect(body.data.createdBy).toBe(user.id);
      expect(body.data.isPublic).toBe(false);
    });

    it('should fail to create exercise without auth', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/exercises',
        payload: {
          code: 'NO_AUTH_EX',
          name: 'No Auth Exercise',
          category: 'strength',
          muscleGroup: 'chest',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should fail with duplicate code', async () => {
      await createExercise({ code: 'DUPLICATE_CODE', name: 'First', isPublic: true });

      const response = await app.inject({
        method: 'POST',
        url: '/api/exercises',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          code: 'DUPLICATE_CODE',
          name: 'Second',
          category: 'strength',
          muscleGroup: 'chest',
        },
      });

      expect(response.statusCode).toBe(400); // API returns BadRequestError (400) for duplicate code
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('code already exists');
    });

    it('should fail with invalid category', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/exercises',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          code: 'INVALID_CAT',
          name: 'Invalid Category',
          category: 'invalid_category',
          muscleGroup: 'chest',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should fail with missing required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/exercises',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          name: 'Missing Fields',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/exercises/system', () => {
    it('should create system exercise when admin', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/exercises/system',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          code: 'SYSTEM_EXERCISE',
          name: 'System Exercise',
          description: 'A system-wide exercise',
          category: 'strength',
          muscleGroup: 'back',
          equipment: 'Barbell',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.code).toBe('SYSTEM_EXERCISE');
      expect(body.data.createdBy).toBeNull();
      expect(body.data.isPublic).toBe(true);
    });

    it('should fail to create system exercise when not admin', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/exercises/system',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          code: 'SYSTEM_FAIL',
          name: 'System Fail',
          category: 'strength',
          muscleGroup: 'chest',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should fail without auth', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/exercises/system',
        payload: {
          code: 'NO_AUTH',
          name: 'No Auth',
          category: 'strength',
          muscleGroup: 'chest',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('PATCH /api/exercises/:id', () => {
    it('should update own custom exercise', async () => {
      const exercise = await createExercise({
        code: 'UPDATE_ME',
        name: 'Old Name',
        isPublic: false,
        createdBy: user.id,
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/exercises/${exercise.id}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          name: 'New Name',
          description: 'Updated description',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('New Name');
      expect(body.data.description).toBe('Updated description');
    });

    it('should not update other user custom exercise', async () => {
      const exercise = await createExercise({
        code: 'OTHER_USER_EX',
        name: 'Other User Exercise',
        isPublic: false,
        createdBy: admin.id,
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/exercises/${exercise.id}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          name: 'Hacked Name',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should allow admin to update any exercise', async () => {
      const exercise = await createExercise({
        code: 'USER_EXERCISE',
        name: 'User Exercise',
        isPublic: false,
        createdBy: user.id,
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/exercises/${exercise.id}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          name: 'Admin Updated',
          isPublic: true,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.name).toBe('Admin Updated');
      expect(body.data.isPublic).toBe(true);
    });

    it('should not allow user to make exercise public', async () => {
      const exercise = await createExercise({
        code: 'USER_PRIVATE',
        name: 'User Private',
        isPublic: false,
        createdBy: user.id,
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/exercises/${exercise.id}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          isPublic: true,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      // isPublic should be ignored for non-admin users
      expect(body.data.isPublic).toBe(false);
    });

    it('should fail without auth', async () => {
      const exercise = await createExercise({
        code: 'NO_AUTH_UPDATE',
        name: 'No Auth',
        isPublic: false,
        createdBy: user.id,
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/exercises/${exercise.id}`,
        payload: {
          name: 'Hacked',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 for non-existent exercise', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/exercises/99999',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          name: 'Does Not Exist',
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/exercises/:id', () => {
    it('should delete own custom exercise', async () => {
      const exercise = await createExercise({
        code: 'DELETE_ME',
        name: 'Delete Me',
        isPublic: false,
        createdBy: user.id,
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/exercises/${exercise.id}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should not delete other user custom exercise', async () => {
      const exercise = await createExercise({
        code: 'OTHER_DELETE',
        name: 'Other Delete',
        isPublic: false,
        createdBy: admin.id,
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/exercises/${exercise.id}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should allow admin to delete any custom exercise', async () => {
      const exercise = await createExercise({
        code: 'ADMIN_DELETE',
        name: 'Admin Delete',
        isPublic: false,
        createdBy: user.id,
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/exercises/${exercise.id}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should not allow deletion of system exercises', async () => {
      const exercise = await createExercise({
        code: 'SYSTEM_NO_DELETE',
        name: 'System Exercise',
        isPublic: true,
        createdBy: null,
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/exercises/${exercise.id}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain('System exercises cannot be deleted');
    });

    it('should fail without auth', async () => {
      const exercise = await createExercise({
        code: 'NO_AUTH_DEL',
        name: 'No Auth',
        isPublic: false,
        createdBy: user.id,
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/exercises/${exercise.id}`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 for non-existent exercise', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/exercises/99999',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildTestApp } from '../helper/app-helper';
import { createUser, createExercise, createWorkout } from '../helper/factories';
import { generateTestToken } from '../helper/factories';
import type { FastifyInstance } from 'fastify';
import type { User } from '@/db/schema/users';
import type { Exercise } from '@/db/schema/exercises';
import '../helper/setup';

describe('Workouts Routes', () => {
  let app: FastifyInstance;
  let user: User;
  let otherUser: User;
  let userToken: string;
  let _otherUserToken: string;
  let exercise1: Exercise;
  let exercise2: Exercise;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    // Create test users
    user = await createUser({ email: `user-${Date.now()}@test.com`, role: 'user' });
    otherUser = await createUser({ email: `other-${Date.now()}@test.com`, role: 'user' });

    // Generate tokens
    const userTokens = await generateTestToken({ id: user.id, email: user.email, role: user.role });
    const otherTokens = await generateTestToken({
      id: otherUser.id,
      email: otherUser.email,
      role: otherUser.role,
    });

    userToken = userTokens.accessToken;
    _otherUserToken = otherTokens.accessToken;

    // Create test exercises
    exercise1 = await createExercise({
      code: `EXERCISE1_${Date.now()}`,
      name: 'Exercise 1',
      isPublic: true,
    });
    exercise2 = await createExercise({
      code: `EXERCISE2_${Date.now()}`,
      name: 'Exercise 2',
      isPublic: true,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/workouts', () => {
    it('should list user workouts and public workouts', async () => {
      // Create user's workout
      await createWorkout({ name: 'My Workout', ownerId: user.id, isPublic: false });
      // Create public workout from other user
      await createWorkout({ name: 'Public Template', ownerId: otherUser.id, isPublic: true });

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
      expect(body.data.workouts.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter workouts by isTemplate', async () => {
      await createWorkout({
        name: 'Template',
        ownerId: user.id,
        isTemplate: true,
        isPublic: true,
      });
      await createWorkout({ name: 'Regular', ownerId: user.id, isTemplate: false });

      const response = await app.inject({
        method: 'GET',
        url: '/api/workouts?isTemplate=true',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.workouts.every((w: { isTemplate: boolean }) => w.isTemplate === true)).toBe(true);
    });

    it('should filter workouts by difficulty', async () => {
      await createWorkout({
        name: 'Beginner Workout',
        ownerId: user.id,
        difficulty: 'beginner',
      });
      await createWorkout({
        name: 'Advanced Workout',
        ownerId: user.id,
        difficulty: 'advanced',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/workouts?difficulty=beginner',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.workouts.every((w: { difficulty: string }) => w.difficulty === 'beginner')).toBe(true);
    });

    it('should search workouts by name', async () => {
      await createWorkout({ name: 'Upper Body Strength', ownerId: user.id });
      await createWorkout({ name: 'Lower Body Cardio', ownerId: user.id });

      const response = await app.inject({
        method: 'GET',
        url: '/api/workouts?search=Upper',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.workouts.some((w: { name: string }) => w.name.includes('Upper'))).toBe(true);
    });

    it('should paginate workouts', async () => {
      // Create multiple workouts
      for (let i = 0; i < 5; i++) {
        await createWorkout({ name: `Workout ${i}`, ownerId: user.id });
      }

      const response = await app.inject({
        method: 'GET',
        url: '/api/workouts?page=1&limit=3',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.pagination.page).toBe(1);
      expect(body.data.pagination.limit).toBe(3);
    });

    it('should fail without auth', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/workouts',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/workouts/shared/with-me', () => {
    it('should list workouts shared with current user', async () => {
      const workout = await createWorkout({
        name: 'Shared Workout',
        ownerId: otherUser.id,
        isPublic: false,
      });

      // Share workout with user (Note: direct DB insert for testing)
      const { db } = await import('@/db/client');
      const { workoutShares } = await import('@/db/schema/workout-shares');
      await db.insert(workoutShares).values({
        workoutId: workout.id,
        sharedById: otherUser.id,
        sharedWithId: user.id,
        permission: 'view',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/workouts/shared/with-me',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeInstanceOf(Array);
    });

    it('should fail without auth', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/workouts/shared/with-me',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/workouts/:id', () => {
    it('should get own workout by ID', async () => {
      const workout = await createWorkout({ name: 'My Workout', ownerId: user.id });

      const response = await app.inject({
        method: 'GET',
        url: `/api/workouts/${workout.id}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(workout.id);
      expect(body.data.name).toBe('My Workout');
    });

    it('should get public workout by ID', async () => {
      const workout = await createWorkout({
        name: 'Public Workout',
        ownerId: otherUser.id,
        isPublic: true,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/workouts/${workout.id}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.id).toBe(workout.id);
    });

    it('should not get other user private workout', async () => {
      const workout = await createWorkout({
        name: 'Private Workout',
        ownerId: otherUser.id,
        isPublic: false,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/workouts/${workout.id}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for non-existent workout', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/workouts/99999',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should fail without auth', async () => {
      const workout = await createWorkout({ name: 'Workout', ownerId: user.id });

      const response = await app.inject({
        method: 'GET',
        url: `/api/workouts/${workout.id}`,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/workouts', () => {
    it('should create workout with exercises', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/workouts',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          name: 'New Workout',
          description: 'A test workout',
          difficulty: 'beginner',
          isTemplate: false,
          isPublic: false,
          exercises: [
            {
              exerciseId: exercise1.id,
              orderIndex: 0,
              reps: 10,
              workingSetsCount: 3,
              workingRestSeconds: 120,
            },
            {
              exerciseId: exercise2.id,
              orderIndex: 1,
              reps: 12,
              workingSetsCount: 4,
              workingRestSeconds: 120,
            },
          ],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('New Workout');
      expect(body.data.ownerId).toBe(user.id);
    });

    it('should create workout without exercises', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/workouts',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          name: 'Empty Workout',
          description: 'No exercises yet',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.name).toBe('Empty Workout');
    });

    it('should fail with missing required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/workouts',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          description: 'Missing name',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should fail without auth', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/workouts',
        payload: {
          name: 'No Auth Workout',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('PATCH /api/workouts/:id', () => {
    it('should update own workout', async () => {
      const workout = await createWorkout({ name: 'Original', ownerId: user.id });

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/workouts/${workout.id}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          name: 'Updated',
          description: 'Updated description',
          difficulty: 'advanced',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Updated');
      expect(body.data.difficulty).toBe('advanced');
    });

    it('should not update other user workout', async () => {
      const workout = await createWorkout({
        name: 'Other User Workout',
        ownerId: otherUser.id,
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/workouts/${workout.id}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          name: 'Hacked',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 for non-existent workout (secure behavior)', async () => {
      // API returns 403 instead of 404 to not reveal resource existence
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/workouts/99999',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          name: 'Update',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should fail without auth', async () => {
      const workout = await createWorkout({ name: 'Workout', ownerId: user.id });

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/workouts/${workout.id}`,
        payload: {
          name: 'No Auth Update',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/workouts/:id', () => {
    it('should delete own workout', async () => {
      const workout = await createWorkout({ name: 'To Delete', ownerId: user.id });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/workouts/${workout.id}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should not delete other user workout', async () => {
      const workout = await createWorkout({
        name: 'Other User Workout',
        ownerId: otherUser.id,
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/workouts/${workout.id}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 for non-existent workout (secure behavior)', async () => {
      // API returns 403 instead of 404 to not reveal resource existence
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/workouts/99999',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should fail without auth', async () => {
      const workout = await createWorkout({ name: 'Workout', ownerId: user.id });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/workouts/${workout.id}`,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/workouts/:id/exercises', () => {
    it('should add exercises to workout', async () => {
      const workout = await createWorkout({ name: 'Workout', ownerId: user.id });

      const response = await app.inject({
        method: 'POST',
        url: `/api/workouts/${workout.id}/exercises`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          exercises: [
            {
              exerciseId: exercise1.id,
              orderIndex: 0,
              reps: 10,
              workingSetsCount: 3,
              workingRestSeconds: 120,
            },
          ],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should not add exercises to other user workout', async () => {
      const workout = await createWorkout({
        name: 'Other User Workout',
        ownerId: otherUser.id,
      });

      const response = await app.inject({
        method: 'POST',
        url: `/api/workouts/${workout.id}/exercises`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          exercises: [{ exerciseId: exercise1.id, orderIndex: 0 }],
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should fail without auth', async () => {
      const workout = await createWorkout({ name: 'Workout', ownerId: user.id });

      const response = await app.inject({
        method: 'POST',
        url: `/api/workouts/${workout.id}/exercises`,
        payload: {
          exercises: [{ exerciseId: exercise1.id, orderIndex: 0 }],
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/workouts/:id/exercises/:exerciseId', () => {
    it('should remove exercise from workout', async () => {
      const workout = await createWorkout({ name: 'Workout', ownerId: user.id });

      // Add exercise first
      const { db } = await import('@/db/client');
      const { workoutExercises } = await import('@/db/schema/workout-exercises');
      await db.insert(workoutExercises).values({
        workoutId: workout.id,
        exerciseId: exercise1.id,
        orderIndex: 0,
        warmupSetsCount: 2,
        warmupRestSeconds: 60,
        workingSetsCount: 3,
        workingRestSeconds: 120,
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/workouts/${workout.id}/exercises/${exercise1.id}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should not remove exercise from other user workout', async () => {
      const workout = await createWorkout({
        name: 'Other User Workout',
        ownerId: otherUser.id,
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/workouts/${workout.id}/exercises/${exercise1.id}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should fail without auth', async () => {
      const workout = await createWorkout({ name: 'Workout', ownerId: user.id });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/workouts/${workout.id}/exercises/${exercise1.id}`,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/workouts/:id/share', () => {
    it('should share workout with another user', async () => {
      const workout = await createWorkout({ name: 'Shared Workout', ownerId: user.id });

      const response = await app.inject({
        method: 'POST',
        url: `/api/workouts/${workout.id}/share`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          sharedWithId: otherUser.id,
          permission: 'view',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should not share other user workout', async () => {
      const workout = await createWorkout({
        name: 'Other User Workout',
        ownerId: otherUser.id,
      });

      const response = await app.inject({
        method: 'POST',
        url: `/api/workouts/${workout.id}/share`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          sharedWithId: otherUser.id,
          permission: 'view',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should fail with missing required fields', async () => {
      const workout = await createWorkout({ name: 'Workout', ownerId: user.id });

      const response = await app.inject({
        method: 'POST',
        url: `/api/workouts/${workout.id}/share`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          permission: 'view',
          // Missing sharedWithId
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should fail without auth', async () => {
      const workout = await createWorkout({ name: 'Workout', ownerId: user.id });

      const response = await app.inject({
        method: 'POST',
        url: `/api/workouts/${workout.id}/share`,
        payload: {
          sharedWithId: otherUser.id,
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/workouts/:id/share/:sharedWithId', () => {
    it('should unshare workout', async () => {
      const workout = await createWorkout({ name: 'Shared Workout', ownerId: user.id });

      // Share first
      const { db } = await import('@/db/client');
      const { workoutShares } = await import('@/db/schema/workout-shares');
      await db.insert(workoutShares).values({
        workoutId: workout.id,
        sharedById: user.id,
        sharedWithId: otherUser.id,
        permission: 'view',
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/workouts/${workout.id}/share/${otherUser.id}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should not unshare other user workout', async () => {
      const workout = await createWorkout({
        name: 'Other User Workout',
        ownerId: otherUser.id,
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/workouts/${workout.id}/share/${user.id}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should fail without auth', async () => {
      const workout = await createWorkout({ name: 'Workout', ownerId: user.id });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/workouts/${workout.id}/share/${otherUser.id}`,
      });

      expect(response.statusCode).toBe(401);
    });
  });
});

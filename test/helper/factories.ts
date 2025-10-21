import { testDb } from './test-db';
import { users } from '@/db/schema/users';
import { exercises } from '@/db/schema/exercises';
import { workouts } from '@/db/schema/workouts';
import { workoutExercises } from '@/db/schema/workout-exercises';
import { workoutShares } from '@/db/schema/workout-shares';
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import env from '@/config/env';
import type { JWTPayload } from '@/modules/auth/auth.types';

/**
 * User factory - creates test users
 */
export async function createUser(overrides: Partial<typeof users.$inferInsert> = {}) {
  const [user] = await testDb
    .insert(users)
    .values({
      email: overrides.email || `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
      name: overrides.name || 'Test User',
      avatar: overrides.avatar || null,
      provider: (overrides.provider as 'google' | 'apple') || 'google',
      providerId: overrides.providerId || `google_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      role: overrides.role || 'user',
      ...overrides,
    })
    .returning();

  return user!;
}

/**
 * Exercise factory - creates test exercises
 */
export async function createExercise(overrides: Partial<typeof exercises.$inferInsert> = {}) {
  const [exercise] = await testDb
    .insert(exercises)
    .values({
      code: overrides.code || `TEST_EXERCISE_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      name: overrides.name || 'Test Exercise',
      description: overrides.description || 'Test exercise description',
      category: overrides.category || 'strength',
      muscleGroup: overrides.muscleGroup || 'chest',
      equipment: overrides.equipment || 'Barbell',
      videoUrl: overrides.videoUrl || null,
      instructions: overrides.instructions || '1. Step one\n2. Step two',
      createdBy: overrides.createdBy || null,
      isPublic: overrides.isPublic !== undefined ? overrides.isPublic : true,
      ...overrides,
    })
    .returning();

  return exercise!;
}

/**
 * Workout factory - creates test workouts
 */
export async function createWorkout(overrides: Partial<typeof workouts.$inferInsert> = {}) {
  const [workout] = await testDb
    .insert(workouts)
    .values({
      name: overrides.name || 'Test Workout',
      description: overrides.description || 'Test workout description',
      ownerId: overrides.ownerId!,
      isTemplate: overrides.isTemplate !== undefined ? overrides.isTemplate : false,
      isPublic: overrides.isPublic !== undefined ? overrides.isPublic : false,
      isLocked: overrides.isLocked !== undefined ? overrides.isLocked : false,
      difficulty: overrides.difficulty || 'intermediate',
      duration: overrides.duration || 60,
      tags: overrides.tags || ['test'],
      ...overrides,
    })
    .returning();

  return workout!;
}

/**
 * Workout Exercise factory - creates test workout exercises
 */
export async function createWorkoutExercise(
  overrides: Partial<typeof workoutExercises.$inferInsert> = {}
) {
  const [workoutExercise] = await testDb
    .insert(workoutExercises)
    .values({
      workoutId: overrides.workoutId!,
      exerciseId: overrides.exerciseId!,
      orderIndex: overrides.orderIndex !== undefined ? overrides.orderIndex : 1,
      sets: overrides.sets !== undefined ? overrides.sets : 3,
      reps: overrides.reps !== undefined ? overrides.reps : 10,
      weight: overrides.weight || null,
      restSeconds: overrides.restSeconds !== undefined ? overrides.restSeconds : 60,
      notes: overrides.notes || null,
      ...overrides,
    })
    .returning();

  return workoutExercise!;
}

/**
 * Workout Share factory - creates test workout shares
 */
export async function createWorkoutShare(
  overrides: Partial<typeof workoutShares.$inferInsert> = {}
) {
  const [share] = await testDb
    .insert(workoutShares)
    .values({
      workoutId: overrides.workoutId!,
      sharedById: overrides.sharedById!,
      sharedWithId: overrides.sharedWithId!,
      permission: overrides.permission || 'view',
      ...overrides,
    })
    .returning();

  return share!;
}

/**
 * Generate JWT token for testing
 */
export async function generateTestToken(user: {
  id: number;
  email: string;
  role: 'user' | 'coach' | 'admin' | 'superadmin';
}): Promise<{ accessToken: string; refreshToken: string }> {
  const fastify = Fastify({ logger: false });
  await fastify.register(fastifyJwt, { secret: env.JWT_SECRET });

  const payload: JWTPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = fastify.jwt.sign(payload, {
    expiresIn: env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m',
  });

  const refreshToken = fastify.jwt.sign(payload, {
    expiresIn: env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d',
  });

  await fastify.close();

  return { accessToken, refreshToken };
}

/**
 * Create a complete test scenario with user, exercises, and workout
 */
export async function createTestScenario() {
  const user = await createUser({ email: 'owner@test.com', name: 'Owner User' });
  const coach = await createUser({ email: 'coach@test.com', name: 'Coach User', role: 'coach' });
  const admin = await createUser({ email: 'admin@test.com', name: 'Admin User', role: 'admin' });

  const publicExercise = await createExercise({
    code: 'PUBLIC_EXERCISE',
    name: 'Public Exercise',
    isPublic: true,
    createdBy: null,
  });

  const customExercise = await createExercise({
    code: 'CUSTOM_EXERCISE',
    name: 'Custom Exercise',
    isPublic: false,
    createdBy: user.id,
  });

  const workout = await createWorkout({
    name: 'Test Workout',
    ownerId: user.id,
  });

  await createWorkoutExercise({
    workoutId: workout.id,
    exerciseId: publicExercise.id,
    orderIndex: 1,
  });

  await createWorkoutExercise({
    workoutId: workout.id,
    exerciseId: customExercise.id,
    orderIndex: 2,
  });

  const share = await createWorkoutShare({
    workoutId: workout.id,
    sharedById: user.id,
    sharedWithId: coach.id,
    permission: 'view',
  });

  return {
    user,
    coach,
    admin,
    publicExercise,
    customExercise,
    workout,
    share,
  };
}

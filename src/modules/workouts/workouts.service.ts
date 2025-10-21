import { eq, and, or, ilike, sql, desc, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { workouts } from '@/db/schema/workouts';
import { workoutExercises } from '@/db/schema/workout-exercises';
import { workoutShares } from '@/db/schema/workout-shares';
import { exercises } from '@/db/schema/exercises';
import { users } from '@/db/schema/users';
import type {
  ListWorkoutsQuery,
  CreateWorkoutBody,
  UpdateWorkoutBody,
  CreateWorkoutExerciseBody,
  ShareWorkoutBody,
  PaginatedWorkouts,
  WorkoutWithDetails,
  WorkoutExerciseWithDetails,
  WorkoutShareWithDetails,
} from './workouts.types';
import { BadRequestError, NotFoundError, ForbiddenError } from '@/utils/errors';

export class WorkoutsService {
  /**
   * Check if user can access a workout
   * Returns true if user owns, is shared with, or workout is public
   */
  async canAccessWorkout(workoutId: number, userId: number): Promise<{
    canAccess: boolean;
    isOwner: boolean;
    permission?: 'view' | 'copy';
  }> {
    // Get workout
    const [workout] = await db
      .select()
      .from(workouts)
      .where(eq(workouts.id, workoutId))
      .limit(1);

    if (!workout) {
      return { canAccess: false, isOwner: false };
    }

    // Owner has full access
    if (workout.ownerId === userId) {
      return { canAccess: true, isOwner: true };
    }

    // Check if workout is public
    if (workout.isPublic) {
      return { canAccess: true, isOwner: false, permission: 'copy' };
    }

    // Check if shared with user
    const [share] = await db
      .select()
      .from(workoutShares)
      .where(
        and(
          eq(workoutShares.workoutId, workoutId),
          eq(workoutShares.sharedWithId, userId)
        )
      )
      .limit(1);

    if (share) {
      return { canAccess: true, isOwner: false, permission: share.permission };
    }

    return { canAccess: false, isOwner: false };
  }

  /**
   * Get accessible workout IDs for a user
   * Includes owned, public, and shared workouts
   */
  async getAccessibleWorkoutIds(userId: number): Promise<number[]> {
    // Get workout IDs from shares
    const shares = await db
      .select({ workoutId: workoutShares.workoutId })
      .from(workoutShares)
      .where(eq(workoutShares.sharedWithId, userId));

    const sharedWorkoutIds = shares.map(s => s.workoutId);

    // Get all accessible workouts (owned + public + shared)
    const accessibleWorkouts = await db
      .select({ id: workouts.id })
      .from(workouts)
      .where(
        or(
          eq(workouts.ownerId, userId), // Owned
          eq(workouts.isPublic, true), // Public
          sharedWorkoutIds.length > 0 ? inArray(workouts.id, sharedWorkoutIds) : undefined // Shared
        )
      );

    return accessibleWorkouts.map(w => w.id);
  }

  /**
   * List workouts with filtering and pagination
   */
  async listWorkouts(
    query: ListWorkoutsQuery,
    userId: number
  ): Promise<PaginatedWorkouts> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];

    // Filter by template
    if (query.isTemplate !== undefined) {
      conditions.push(eq(workouts.isTemplate, query.isTemplate));
    }

    // Filter by difficulty
    if (query.difficulty) {
      conditions.push(eq(workouts.difficulty, query.difficulty));
    }

    // Search by name or description
    if (query.search) {
      conditions.push(
        or(
          ilike(workouts.name, `%${query.search}%`),
          ilike(workouts.description, `%${query.search}%`)
        )
      );
    }

    // Get accessible workout IDs
    const accessibleIds = await this.getAccessibleWorkoutIds(userId);

    if (accessibleIds.length === 0) {
      return {
        workouts: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      };
    }

    conditions.push(inArray(workouts.id, accessibleIds));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(workouts)
      .where(whereClause);

    const count = countResult[0]?.count || 0;

    // Get paginated results with owner info
    const results = await db
      .select({
        workout: workouts,
        owner: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(workouts)
      .leftJoin(users, eq(workouts.ownerId, users.id))
      .where(whereClause)
      .orderBy(desc(workouts.createdAt))
      .limit(limit)
      .offset(offset);

    // Get exercises for each workout
    const workoutIds = results.map(r => r.workout.id);
    const workoutExercisesData = await this.getWorkoutExercisesBatch(workoutIds);

    // Get share info for workouts
    const shareInfo = await this.getShareInfoBatch(workoutIds, userId);

    // Combine data
    const workoutsWithDetails: WorkoutWithDetails[] = results.map(r => ({
      ...r.workout,
      exercises: workoutExercisesData[r.workout.id] || [],
      owner: r.owner!,
      isSharedWithMe: shareInfo[r.workout.id]?.isShared || false,
      sharePermission: shareInfo[r.workout.id]?.permission,
    }));

    return {
      workouts: workoutsWithDetails,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * Get workout by ID with full details
   */
  async getWorkoutById(id: number, userId: number): Promise<WorkoutWithDetails> {
    // Check access
    const access = await this.canAccessWorkout(id, userId);
    if (!access.canAccess) {
      throw new NotFoundError('Workout not found');
    }

    // Get workout with owner
    const [result] = await db
      .select({
        workout: workouts,
        owner: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(workouts)
      .leftJoin(users, eq(workouts.ownerId, users.id))
      .where(eq(workouts.id, id))
      .limit(1);

    if (!result) {
      throw new NotFoundError('Workout not found');
    }

    // Get exercises
    const exercisesData = await this.getWorkoutExercises(id);

    return {
      ...result.workout,
      exercises: exercisesData,
      owner: result.owner!,
      isSharedWithMe: !access.isOwner,
      sharePermission: access.permission,
    };
  }

  /**
   * Create a new workout
   */
  async createWorkout(
    body: CreateWorkoutBody,
    ownerId: number
  ): Promise<WorkoutWithDetails> {
    // Create workout
    const [workout] = await db
      .insert(workouts)
      .values({
        name: body.name,
        description: body.description || null,
        ownerId,
        isTemplate: body.isTemplate || false,
        isPublic: body.isPublic || false,
        difficulty: body.difficulty || null,
        duration: body.duration || null,
        tags: body.tags || null,
      })
      .returning();

    // Add exercises if provided
    if (body.exercises && body.exercises.length > 0) {
      await this.addExercisesToWorkout(workout!.id, body.exercises, ownerId);
    }

    // Get full workout details
    return this.getWorkoutById(workout!.id, ownerId);
  }

  /**
   * Update a workout
   */
  async updateWorkout(
    id: number,
    body: UpdateWorkoutBody,
    userId: number
  ): Promise<WorkoutWithDetails> {
    // Check access
    const access = await this.canAccessWorkout(id, userId);
    if (!access.isOwner) {
      throw new ForbiddenError('Only the workout owner can update it');
    }

    // Get existing workout
    const [existing] = await db
      .select()
      .from(workouts)
      .where(eq(workouts.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Workout not found');
    }

    // Check if locked
    if (existing.isLocked) {
      throw new ForbiddenError('This workout is locked and cannot be edited');
    }

    // Update workout
    await db
      .update(workouts)
      .set({
        name: body.name ?? existing.name,
        description: body.description ?? existing.description,
        isTemplate: body.isTemplate ?? existing.isTemplate,
        isPublic: body.isPublic ?? existing.isPublic,
        isLocked: body.isLocked ?? existing.isLocked,
        difficulty: body.difficulty ?? existing.difficulty,
        duration: body.duration ?? existing.duration,
        tags: body.tags ?? existing.tags,
        updatedAt: new Date(),
      })
      .where(eq(workouts.id, id));

    return this.getWorkoutById(id, userId);
  }

  /**
   * Delete a workout
   */
  async deleteWorkout(id: number, userId: number): Promise<void> {
    // Check access
    const access = await this.canAccessWorkout(id, userId);
    if (!access.isOwner) {
      throw new ForbiddenError('Only the workout owner can delete it');
    }

    // Delete workout (cascades to exercises and shares)
    await db.delete(workouts).where(eq(workouts.id, id));
  }

  /**
   * Get workout exercises with exercise details
   */
  private async getWorkoutExercises(
    workoutId: number
  ): Promise<WorkoutExerciseWithDetails[]> {
    const result = await db
      .select({
        workoutExercise: workoutExercises,
        exercise: {
          id: exercises.id,
          code: exercises.code,
          name: exercises.name,
          description: exercises.description,
          category: exercises.category,
          muscleGroup: exercises.muscleGroup,
          equipment: exercises.equipment,
          videoUrl: exercises.videoUrl,
          isPublic: exercises.isPublic,
          createdBy: exercises.createdBy,
        },
      })
      .from(workoutExercises)
      .leftJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
      .where(eq(workoutExercises.workoutId, workoutId))
      .orderBy(workoutExercises.orderIndex);

    return result.map(r => ({
      ...r.workoutExercise,
      exercise: r.exercise!,
    }));
  }

  /**
   * Get exercises for multiple workouts (batch operation)
   */
  private async getWorkoutExercisesBatch(
    workoutIds: number[]
  ): Promise<Record<number, WorkoutExerciseWithDetails[]>> {
    if (workoutIds.length === 0) return {};

    const result = await db
      .select({
        workoutExercise: workoutExercises,
        exercise: {
          id: exercises.id,
          code: exercises.code,
          name: exercises.name,
          description: exercises.description,
          category: exercises.category,
          muscleGroup: exercises.muscleGroup,
          equipment: exercises.equipment,
          videoUrl: exercises.videoUrl,
          isPublic: exercises.isPublic,
          createdBy: exercises.createdBy,
        },
      })
      .from(workoutExercises)
      .leftJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
      .where(inArray(workoutExercises.workoutId, workoutIds))
      .orderBy(workoutExercises.orderIndex);

    // Group by workout ID
    const grouped: Record<number, WorkoutExerciseWithDetails[]> = {};
    for (const row of result) {
      if (!grouped[row.workoutExercise.workoutId]) {
        grouped[row.workoutExercise.workoutId] = [];
      }
      grouped[row.workoutExercise.workoutId]!.push({
        ...row.workoutExercise,
        exercise: row.exercise!,
      });
    }

    return grouped;
  }

  /**
   * Get share info for multiple workouts (batch operation)
   */
  private async getShareInfoBatch(
    workoutIds: number[],
    userId: number
  ): Promise<Record<number, { isShared: boolean; permission?: 'view' | 'copy' }>> {
    if (workoutIds.length === 0) return {};

    const shares = await db
      .select()
      .from(workoutShares)
      .where(
        and(
          inArray(workoutShares.workoutId, workoutIds),
          eq(workoutShares.sharedWithId, userId)
        )
      );

    const shareInfo: Record<number, { isShared: boolean; permission?: 'view' | 'copy' }> = {};
    for (const share of shares) {
      shareInfo[share.workoutId] = {
        isShared: true,
        permission: share.permission,
      };
    }

    return shareInfo;
  }

  /**
   * Add exercises to a workout
   */
  async addExercisesToWorkout(
    workoutId: number,
    exercisesToAdd: CreateWorkoutExerciseBody[],
    userId: number
  ): Promise<void> {
    // Check access
    const access = await this.canAccessWorkout(workoutId, userId);
    if (!access.isOwner) {
      throw new ForbiddenError('Only the workout owner can add exercises');
    }

    // Verify all exercise IDs exist and user has access to them
    const exerciseIds = exercisesToAdd.map(e => e.exerciseId);
    const existingExercises = await db
      .select({ id: exercises.id, createdBy: exercises.createdBy, isPublic: exercises.isPublic })
      .from(exercises)
      .where(inArray(exercises.id, exerciseIds));

    if (existingExercises.length !== exerciseIds.length) {
      throw new BadRequestError('One or more exercises not found');
    }

    // Check user has access to all exercises (public or owned)
    for (const exercise of existingExercises) {
      if (!exercise.isPublic && exercise.createdBy !== userId) {
        throw new ForbiddenError(`You don't have access to exercise ID ${exercise.id}`);
      }
    }

    // Insert exercises
    await db.insert(workoutExercises).values(
      exercisesToAdd.map(e => ({
        workoutId,
        exerciseId: e.exerciseId,
        orderIndex: e.orderIndex,
        sets: e.sets || null,
        reps: e.reps || null,
        weight: e.weight || null,
        restSeconds: e.restSeconds || null,
        notes: e.notes || null,
      }))
    );
  }

  /**
   * Remove exercise from workout
   */
  async removeExerciseFromWorkout(
    workoutId: number,
    exerciseId: number,
    userId: number
  ): Promise<void> {
    // Check access
    const access = await this.canAccessWorkout(workoutId, userId);
    if (!access.isOwner) {
      throw new ForbiddenError('Only the workout owner can remove exercises');
    }

    await db
      .delete(workoutExercises)
      .where(
        and(
          eq(workoutExercises.workoutId, workoutId),
          eq(workoutExercises.exerciseId, exerciseId)
        )
      );
  }

  /**
   * Share workout with another user
   */
  async shareWorkout(
    workoutId: number,
    body: ShareWorkoutBody,
    sharedById: number
  ): Promise<WorkoutShareWithDetails> {
    // Check ownership
    const access = await this.canAccessWorkout(workoutId, sharedById);
    if (!access.isOwner) {
      throw new ForbiddenError('Only the workout owner can share it');
    }

    // Check if sharing with self
    if (body.sharedWithId === sharedById) {
      throw new BadRequestError('Cannot share workout with yourself');
    }

    // Check if already shared with this user
    const [existing] = await db
      .select()
      .from(workoutShares)
      .where(
        and(
          eq(workoutShares.workoutId, workoutId),
          eq(workoutShares.sharedWithId, body.sharedWithId)
        )
      )
      .limit(1);

    if (existing) {
      // Update existing share permission
      const [updated] = await db
        .update(workoutShares)
        .set({ permission: body.permission || 'view' })
        .where(eq(workoutShares.id, existing.id))
        .returning();

      return this.getShareDetails(updated!.id);
    }

    // Create share
    const [share] = await db
      .insert(workoutShares)
      .values({
        workoutId,
        sharedById,
        sharedWithId: body.sharedWithId,
        permission: body.permission || 'view',
      })
      .returning();

    // Get full share details
    return this.getShareDetails(share!.id);
  }

  /**
   * Unshare workout
   */
  async unshareWorkout(
    workoutId: number,
    sharedWithId: number,
    userId: number
  ): Promise<void> {
    // Check ownership
    const access = await this.canAccessWorkout(workoutId, userId);
    if (!access.isOwner) {
      throw new ForbiddenError('Only the workout owner can unshare it');
    }

    await db
      .delete(workoutShares)
      .where(
        and(
          eq(workoutShares.workoutId, workoutId),
          eq(workoutShares.sharedWithId, sharedWithId)
        )
      );
  }

  /**
   * Get workouts shared with user
   */
  async getSharedWorkouts(userId: number): Promise<WorkoutShareWithDetails[]> {
    const shares = await db
      .select()
      .from(workoutShares)
      .where(eq(workoutShares.sharedWithId, userId));

    return Promise.all(shares.map((share) => this.getShareDetails(share.id)));
  }

  /**
   * Get share details
   */
  private async getShareDetails(shareId: number): Promise<WorkoutShareWithDetails> {
    // Use manual SQL joins to avoid alias conflicts
    const [result] = await db.execute<{
      share_id: number;
      share_workout_id: number;
      share_shared_by_id: number;
      share_shared_with_id: number;
      share_permission: string;
      share_created_at: Date;
      workout_id: number | null;
      workout_name: string | null;
      workout_description: string | null;
      shared_by_id: number | null;
      shared_by_name: string | null;
      shared_by_email: string | null;
      shared_with_id: number | null;
      shared_with_name: string | null;
      shared_with_email: string | null;
    }>(sql`
      SELECT
        ws.id as share_id,
        ws.workout_id as share_workout_id,
        ws.shared_by_id as share_shared_by_id,
        ws.shared_with_id as share_shared_with_id,
        ws.permission as share_permission,
        ws.created_at as share_created_at,
        w.id as workout_id,
        w.name as workout_name,
        w.description as workout_description,
        u1.id as shared_by_id,
        u1.name as shared_by_name,
        u1.email as shared_by_email,
        u2.id as shared_with_id,
        u2.name as shared_with_name,
        u2.email as shared_with_email
      FROM workout_shares ws
      LEFT JOIN workouts w ON ws.workout_id = w.id
      LEFT JOIN users u1 ON ws.shared_by_id = u1.id
      LEFT JOIN users u2 ON ws.shared_with_id = u2.id
      WHERE ws.id = ${shareId}
      LIMIT 1
    `);

    if (!result) {
      throw new NotFoundError('Share not found');
    }

    return {
      id: result.share_id,
      workoutId: result.share_workout_id,
      sharedById: result.share_shared_by_id,
      sharedWithId: result.share_shared_with_id,
      permission: result.share_permission as 'view' | 'copy',
      createdAt: result.share_created_at,
      workout: {
        id: result.workout_id!,
        name: result.workout_name!,
        description: result.workout_description,
      },
      sharedBy: {
        id: result.shared_by_id!,
        name: result.shared_by_name,
        email: result.shared_by_email!,
      },
      sharedWith: {
        id: result.shared_with_id!,
        name: result.shared_with_name,
        email: result.shared_with_email!,
      },
    };
  }

  /**
   * List workouts shared with a user
   */
  async listSharedWorkouts(userId: number): Promise<WorkoutShareWithDetails[]> {
    const results = await db
      .select({
        share: workoutShares,
        workout: {
          id: workouts.id,
          name: workouts.name,
          description: workouts.description,
        },
        sharedBy: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(workoutShares)
      .leftJoin(workouts, eq(workoutShares.workoutId, workouts.id))
      .leftJoin(users, eq(workoutShares.sharedById, users.id))
      .where(eq(workoutShares.sharedWithId, userId))
      .orderBy(desc(workoutShares.createdAt));

    return results.map(r => ({
      ...r.share,
      workout: r.workout!,
      sharedBy: r.sharedBy!,
      sharedWith: { id: userId, name: null, email: '' }, // Simplified since we know it's the current user
    }));
  }
}

export const workoutsService = new WorkoutsService();

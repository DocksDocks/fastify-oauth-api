import { eq, and, or, gte, lte, sql, desc, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { workoutLogs } from '@/db/schema/workout-logs';
import { setLogs } from '@/db/schema/set-logs';
import { workouts } from '@/db/schema/workouts';
import { workoutExercises } from '@/db/schema/workout-exercises';
import { exercises } from '@/db/schema/exercises';
import type {
  ListSessionsQuery,
  StartSessionBody,
  LogSetBody,
  CompleteSessionBody,
  CreateManualSessionBody,
  WorkoutLogWithDetails,
  SessionWithExercises,
  PaginatedSessions,
  SetLogWithDetails,
  SessionExerciseInfo,
} from './workout-sessions.types';
import { BadRequestError, NotFoundError, ForbiddenError } from '@/utils/errors';

export class WorkoutSessionsService {
  /**
   * Start a live workout session
   */
  async startSession(
    body: StartSessionBody,
    userId: number
  ): Promise<SessionWithExercises> {
    // Verify workout exists and user has access
    const [workout] = await db
      .select()
      .from(workouts)
      .where(eq(workouts.id, body.workoutId))
      .limit(1);

    if (!workout) {
      throw new NotFoundError('Workout not found');
    }

    // Check if user can access this workout (owner or shared)
    if (workout.ownerId !== userId) {
      // TODO: Check if shared with user
      throw new ForbiddenError('You do not have access to this workout');
    }

    // Create workout log
    const [workoutLog] = await db
      .insert(workoutLogs)
      .values({
        userId,
        workoutId: body.workoutId,
        name: null,
        status: 'in_progress',
        sessionType: 'live',
        startedAt: body.startedAt ? new Date(body.startedAt) : new Date(),
        performedAt: body.startedAt ? new Date(body.startedAt) : new Date(),
        bodyweight: body.bodyweight || null,
      })
      .returning();

    // Get workout exercises
    const workoutExercisesData = await db
      .select({
        workoutExercise: workoutExercises,
        exercise: exercises,
      })
      .from(workoutExercises)
      .leftJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
      .where(eq(workoutExercises.workoutId, body.workoutId))
      .orderBy(workoutExercises.orderIndex);

    const exerciseInfo: SessionExerciseInfo[] = workoutExercisesData.map(data => ({
      exercise: data.exercise!,
      config: data.workoutExercise,
      completedSets: [],
      nextSetInfo: this.calculateNextSet(data.workoutExercise, []),
    }));

    return {
      ...workoutLog!,
      workout,
      exercises: exerciseInfo,
    };
  }

  /**
   * Log a set during a live session
   */
  async logSet(
    sessionId: number,
    body: LogSetBody,
    userId: number
  ): Promise<{ setLog: SetLogWithDetails; nextSetInfo?: any }> {
    // Verify session exists and belongs to user
    const [session] = await db
      .select()
      .from(workoutLogs)
      .where(and(eq(workoutLogs.id, sessionId), eq(workoutLogs.userId, userId)))
      .limit(1);

    if (!session) {
      throw new NotFoundError('Workout session not found');
    }

    // Check session is in progress
    if (session.status !== 'in_progress') {
      throw new BadRequestError('Cannot log sets for a completed or abandoned session');
    }

    // Verify exercise exists
    const [exercise] = await db
      .select()
      .from(exercises)
      .where(eq(exercises.id, body.exerciseId))
      .limit(1);

    if (!exercise) {
      throw new NotFoundError('Exercise not found');
    }

    // Get all sets for this session and exercise to calculate set number
    const existingSets = await db
      .select()
      .from(setLogs)
      .where(
        and(
          eq(setLogs.workoutLogId, sessionId),
          eq(setLogs.exerciseId, body.exerciseId)
        )
      )
      .orderBy(setLogs.setNumber);

    const setNumber = existingSets.length + 1;

    // Calculate volume (reps × weight)
    const weight = body.weight ? parseFloat(body.weight) : 0;
    const volume = body.reps * weight;

    // Insert set log
    const [setLog] = await db
      .insert(setLogs)
      .values({
        workoutLogId: sessionId,
        exerciseId: body.exerciseId,
        setNumber,
        setType: body.setType,
        setNumberWithinType: body.setNumberWithinType,
        reps: body.reps,
        weight: body.weight || null,
        rpe: body.rpe || null,
        restSeconds: body.restSeconds || null,
        notes: body.notes || null,
        isFailure: body.isFailure || false,
        isPR: false, // TODO: Calculate if this is a PR
        volume: volume.toString(),
      })
      .returning();

    // Get exercise details for response
    const setLogWithDetails: SetLogWithDetails = {
      ...setLog!,
      exercise: {
        id: exercise.id,
        code: exercise.code,
        name: exercise.name,
        muscleGroup: exercise.muscleGroup,
      },
    };

    // Calculate next set info if in a workout
    let nextSetInfo = undefined;
    if (session.workoutId) {
      const [workoutExercise] = await db
        .select()
        .from(workoutExercises)
        .where(
          and(
            eq(workoutExercises.workoutId, session.workoutId),
            eq(workoutExercises.exerciseId, body.exerciseId)
          )
        )
        .limit(1);

      if (workoutExercise) {
        const allSets = [...existingSets, setLog!];
        nextSetInfo = this.calculateNextSet(workoutExercise, allSets);
      }
    }

    return {
      setLog: setLogWithDetails,
      nextSetInfo,
    };
  }

  /**
   * Complete a workout session
   */
  async completeSession(
    sessionId: number,
    body: CompleteSessionBody,
    userId: number
  ): Promise<WorkoutLogWithDetails> {
    // Verify session exists and belongs to user
    const [session] = await db
      .select()
      .from(workoutLogs)
      .where(and(eq(workoutLogs.id, sessionId), eq(workoutLogs.userId, userId)))
      .limit(1);

    if (!session) {
      throw new NotFoundError('Workout session not found');
    }

    // Check session is in progress
    if (session.status !== 'in_progress') {
      throw new BadRequestError('Session is already completed or abandoned');
    }

    const completedAt = body.completedAt ? new Date(body.completedAt) : new Date();

    // Calculate duration if not provided
    let durationMinutes = body.durationMinutes;
    if (!durationMinutes && session.startedAt) {
      const durationMs = completedAt.getTime() - session.startedAt.getTime();
      durationMinutes = Math.round(durationMs / 60000); // Convert to minutes
    }

    // Update session
    await db
      .update(workoutLogs)
      .set({
        status: 'completed',
        completedAt,
        durationMinutes: durationMinutes || null,
        rating: body.rating || null,
        notes: body.notes || null,
        updatedAt: new Date(),
      })
      .where(eq(workoutLogs.id, sessionId));

    // Return session with details
    return this.getSessionById(sessionId, userId);
  }

  /**
   * Abandon a workout session
   */
  async abandonSession(sessionId: number, userId: number): Promise<void> {
    // Verify session exists and belongs to user
    const [session] = await db
      .select()
      .from(workoutLogs)
      .where(and(eq(workoutLogs.id, sessionId), eq(workoutLogs.userId, userId)))
      .limit(1);

    if (!session) {
      throw new NotFoundError('Workout session not found');
    }

    // Update session status
    await db
      .update(workoutLogs)
      .set({
        status: 'abandoned',
        updatedAt: new Date(),
      })
      .where(eq(workoutLogs.id, sessionId));
  }

  /**
   * Create a manual workout session (retrospective logging)
   */
  async createManualSession(
    body: CreateManualSessionBody,
    userId: number
  ): Promise<WorkoutLogWithDetails> {
    // Verify workout exists if provided
    let workoutName = body.workoutName || null;
    if (body.workoutId) {
      const [workout] = await db
        .select()
        .from(workouts)
        .where(eq(workouts.id, body.workoutId))
        .limit(1);

      if (!workout) {
        throw new NotFoundError('Workout not found');
      }

      // Check access
      if (workout.ownerId !== userId) {
        // TODO: Check if shared with user
        throw new ForbiddenError('You do not have access to this workout');
      }

      workoutName = workout.name;
    }

    // Validate exercises exist
    const exerciseIds = body.exercises.map(e => e.exerciseId);
    const existingExercises = await db
      .select()
      .from(exercises)
      .where(inArray(exercises.id, exerciseIds));

    if (existingExercises.length !== exerciseIds.length) {
      throw new BadRequestError('One or more exercises not found');
    }

    // Create workout log
    const [workoutLog] = await db
      .insert(workoutLogs)
      .values({
        userId,
        workoutId: body.workoutId || null,
        name: workoutName,
        status: 'completed',
        sessionType: 'manual',
        startedAt: null, // Manual sessions don't have start time
        completedAt: new Date(body.performedAt),
        performedAt: new Date(body.performedAt),
        durationMinutes: body.durationMinutes || null,
        bodyweight: body.bodyweight || null,
        rating: body.rating || null,
        notes: body.notes || null,
      })
      .returning();

    // Insert all sets
    const setLogsToInsert = [];
    let globalSetNumber = 1;

    for (const exercise of body.exercises) {
      for (const set of exercise.sets) {
        const weight = set.weight ? parseFloat(set.weight) : 0;
        const volume = set.reps * weight;

        setLogsToInsert.push({
          workoutLogId: workoutLog!.id,
          exerciseId: exercise.exerciseId,
          setNumber: globalSetNumber++,
          setType: set.setType,
          setNumberWithinType: set.setNumberWithinType,
          reps: set.reps,
          weight: set.weight || null,
          rpe: set.rpe || null,
          restSeconds: null, // Not tracked for manual sessions
          notes: set.notes || null,
          isFailure: set.isFailure || false,
          isPR: false, // TODO: Calculate PRs
          volume: volume.toString(),
        });
      }
    }

    if (setLogsToInsert.length > 0) {
      await db.insert(setLogs).values(setLogsToInsert);
    }

    // Return session with details
    return this.getSessionById(workoutLog!.id, userId);
  }

  /**
   * Get session by ID with full details
   */
  async getSessionById(
    sessionId: number,
    userId: number
  ): Promise<WorkoutLogWithDetails> {
    // Get session
    const [session] = await db
      .select()
      .from(workoutLogs)
      .where(and(eq(workoutLogs.id, sessionId), eq(workoutLogs.userId, userId)))
      .limit(1);

    if (!session) {
      throw new NotFoundError('Workout session not found');
    }

    // Get workout if exists
    let workout = undefined;
    if (session.workoutId) {
      const [w] = await db
        .select({
          id: workouts.id,
          name: workouts.name,
          description: workouts.description,
        })
        .from(workouts)
        .where(eq(workouts.id, session.workoutId))
        .limit(1);
      workout = w || undefined;
    }

    // Get all sets for this session
    const sets = await db
      .select({
        setLog: setLogs,
        exercise: {
          id: exercises.id,
          code: exercises.code,
          name: exercises.name,
          muscleGroup: exercises.muscleGroup,
        },
      })
      .from(setLogs)
      .leftJoin(exercises, eq(setLogs.exerciseId, exercises.id))
      .where(eq(setLogs.workoutLogId, sessionId))
      .orderBy(setLogs.setNumber);

    const setsWithDetails: SetLogWithDetails[] = sets.map(s => ({
      ...s.setLog,
      exercise: s.exercise!,
    }));

    // Calculate stats
    const totalSets = setsWithDetails.length;
    const totalReps = setsWithDetails.reduce((sum, s) => sum + s.reps, 0);
    const totalVolume = setsWithDetails.reduce((sum, s) => {
      return sum + parseFloat(s.volume || '0');
    }, 0);
    const exercisesCompleted = new Set(setsWithDetails.map(s => s.exerciseId)).size;

    return {
      ...session,
      workout,
      sets: setsWithDetails,
      stats: {
        totalSets,
        totalReps,
        totalVolume,
        exercisesCompleted,
      },
    };
  }

  /**
   * List user's workout sessions with pagination
   */
  async listSessions(
    query: ListSessionsQuery,
    userId: number
  ): Promise<PaginatedSessions> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [eq(workoutLogs.userId, userId)];

    if (query.status) {
      conditions.push(eq(workoutLogs.status, query.status));
    }

    if (query.sessionType) {
      conditions.push(eq(workoutLogs.sessionType, query.sessionType));
    }

    if (query.startDate) {
      conditions.push(gte(workoutLogs.performedAt, new Date(query.startDate)));
    }

    if (query.endDate) {
      conditions.push(lte(workoutLogs.performedAt, new Date(query.endDate)));
    }

    const whereClause = and(...conditions);

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(workoutLogs)
      .where(whereClause);

    const total = countResult?.count || 0;

    // Get sessions
    const sessionsData = await db
      .select()
      .from(workoutLogs)
      .where(whereClause)
      .orderBy(desc(workoutLogs.performedAt))
      .limit(limit)
      .offset(offset);

    // Get details for each session
    const sessions: WorkoutLogWithDetails[] = await Promise.all(
      sessionsData.map(session => this.getSessionById(session.id, userId))
    );

    return {
      sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Delete a workout session
   */
  async deleteSession(sessionId: number, userId: number): Promise<void> {
    // Verify session exists and belongs to user
    const [session] = await db
      .select()
      .from(workoutLogs)
      .where(and(eq(workoutLogs.id, sessionId), eq(workoutLogs.userId, userId)))
      .limit(1);

    if (!session) {
      throw new NotFoundError('Workout session not found');
    }

    // Delete session (cascades to set logs)
    await db.delete(workoutLogs).where(eq(workoutLogs.id, sessionId));
  }

  /**
   * Calculate what the next set should be based on workout config
   */
  private calculateNextSet(
    config: any,
    completedSets: any[]
  ): { setType: string; setNumberWithinType: number; suggestedRestSeconds: number } | undefined {
    const warmupCompleted = completedSets.filter(s => s.setType === 'warmup').length;
    const prepCompleted = completedSets.filter(s => s.setType === 'prep').length;
    const workingCompleted = completedSets.filter(s => s.setType === 'working').length;

    // Check warmup sets
    if (warmupCompleted < config.warmupSetsCount) {
      return {
        setType: 'warmup',
        setNumberWithinType: warmupCompleted + 1,
        suggestedRestSeconds: config.warmupRestSeconds || 60,
      };
    }

    // Check prep sets
    if (prepCompleted < config.prepSetsCount) {
      return {
        setType: 'prep',
        setNumberWithinType: prepCompleted + 1,
        suggestedRestSeconds: config.prepRestSeconds || 90,
      };
    }

    // Check working sets
    if (workingCompleted < config.workingSetsCount) {
      return {
        setType: 'working',
        setNumberWithinType: workingCompleted + 1,
        suggestedRestSeconds: config.workingRestSeconds || 120,
      };
    }

    // All sets completed
    return undefined;
  }
}

export const workoutSessionsService = new WorkoutSessionsService();

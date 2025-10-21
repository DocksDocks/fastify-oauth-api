import type { FastifyRequest, FastifyReply } from 'fastify';
import { workoutsService } from './workouts.service';
import type {
  ListWorkoutsQuery,
  CreateWorkoutBody,
  UpdateWorkoutBody,
  CreateWorkoutExerciseBody,
  ShareWorkoutBody,
} from './workouts.types';

export class WorkoutsController {
  /**
   * GET /api/workouts
   * List workouts accessible to the user
   */
  async listWorkouts(
    request: FastifyRequest<{ Querystring: ListWorkoutsQuery }>,
    reply: FastifyReply
  ): Promise<void> {
    const userId = request.user!.id;

    const result = await workoutsService.listWorkouts(request.query, userId);

    reply.code(200).send({
      success: true,
      data: result,
    });
  }

  /**
   * GET /api/workouts/:id
   * Get workout by ID with full details
   */
  async getWorkoutById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const userId = request.user!.id;
    const id = parseInt(request.params.id, 10);

    const workout = await workoutsService.getWorkoutById(id, userId);

    return reply.code(200).send({
      success: true,
      data: workout,
    });
  }

  /**
   * POST /api/workouts
   * Create a new workout
   */
  async createWorkout(
    request: FastifyRequest<{ Body: CreateWorkoutBody }>,
    reply: FastifyReply
  ): Promise<void> {
    const userId = request.user!.id;

    const workout = await workoutsService.createWorkout(request.body, userId);

    reply.code(201).send({
      success: true,
      message: 'Workout created successfully',
      data: workout,
    });
  }

  /**
   * PATCH /api/workouts/:id
   * Update a workout
   */
  async updateWorkout(
    request: FastifyRequest<{
      Params: { id: string };
      Body: UpdateWorkoutBody;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    const userId = request.user!.id;
    const id = parseInt(request.params.id, 10);

    const workout = await workoutsService.updateWorkout(id, request.body, userId);

    reply.code(200).send({
      success: true,
      message: 'Workout updated successfully',
      data: workout,
    });
  }

  /**
   * DELETE /api/workouts/:id
   * Delete a workout
   */
  async deleteWorkout(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const userId = request.user!.id;
    const id = parseInt(request.params.id, 10);

    await workoutsService.deleteWorkout(id, userId);

    reply.code(200).send({
      success: true,
      message: 'Workout deleted successfully',
    });
  }

  /**
   * POST /api/workouts/:id/exercises
   * Add exercises to a workout
   */
  async addExercisesToWorkout(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { exercises: CreateWorkoutExerciseBody[] };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    const userId = request.user!.id;
    const workoutId = parseInt(request.params.id, 10);

    await workoutsService.addExercisesToWorkout(workoutId, request.body.exercises, userId);

    reply.code(201).send({
      success: true,
      message: 'Exercises added to workout successfully',
    });
  }

  /**
   * DELETE /api/workouts/:id/exercises/:exerciseId
   * Remove an exercise from a workout
   */
  async removeExerciseFromWorkout(
    request: FastifyRequest<{ Params: { id: string; exerciseId: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const userId = request.user!.id;
    const workoutId = parseInt(request.params.id, 10);
    const exerciseId = parseInt(request.params.exerciseId, 10);

    await workoutsService.removeExerciseFromWorkout(workoutId, exerciseId, userId);

    reply.code(200).send({
      success: true,
      message: 'Exercise removed from workout successfully',
    });
  }

  /**
   * POST /api/workouts/:id/share
   * Share a workout with another user
   */
  async shareWorkout(
    request: FastifyRequest<{
      Params: { id: string };
      Body: ShareWorkoutBody;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    const userId = request.user!.id;
    const workoutId = parseInt(request.params.id, 10);

    const share = await workoutsService.shareWorkout(workoutId, request.body, userId);

    reply.code(201).send({
      success: true,
      message: 'Workout shared successfully',
      data: share,
    });
  }

  /**
   * DELETE /api/workouts/:id/share/:sharedWithId
   * Unshare a workout
   */
  async unshareWorkout(
    request: FastifyRequest<{ Params: { id: string; sharedWithId: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const userId = request.user!.id;
    const workoutId = parseInt(request.params.id, 10);
    const sharedWithId = parseInt(request.params.sharedWithId, 10);

    await workoutsService.unshareWorkout(workoutId, sharedWithId, userId);

    reply.code(200).send({
      success: true,
      message: 'Workout unshared successfully',
    });
  }

  /**
   * GET /api/workouts/shared/with-me
   * List workouts shared with the current user
   */
  async listSharedWorkouts(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user!.id;

    const shares = await workoutsService.listSharedWorkouts(userId);

    reply.code(200).send({
      success: true,
      data: shares,
    });
  }
}

export const workoutsController = new WorkoutsController();

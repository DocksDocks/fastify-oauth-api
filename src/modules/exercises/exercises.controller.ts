import type { FastifyRequest, FastifyReply } from 'fastify';
import { exercisesService } from './exercises.service';
import type {
  ListExercisesQuery,
  CreateExerciseBody,
  UpdateExerciseBody,
} from './exercises.types';

export class ExercisesController {
  /**
   * GET /api/exercises
   * List exercises with filtering and pagination
   */
  async listExercises(
    request: FastifyRequest<{ Querystring: ListExercisesQuery }>,
    reply: FastifyReply
  ): Promise<void> {
    const userId = request.user?.id; // Optional auth

    const result = await exercisesService.listExercises(request.query, userId);

    reply.code(200).send({
      success: true,
      data: result,
    });
  }

  /**
   * GET /api/exercises/:code
   * Get exercise by code
   */
  async getExerciseByCode(
    request: FastifyRequest<{ Params: { code: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const userId = request.user?.id; // Optional auth

    const exercise = await exercisesService.getExerciseByCode(
      request.params.code,
      userId
    );

    reply.code(200).send({
      success: true,
      data: exercise,
    });
  }

  /**
   * GET /api/exercises/id/:id
   * Get exercise by ID
   */
  async getExerciseById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const userId = request.user?.id; // Optional auth
    const id = parseInt(request.params.id, 10);

    const exercise = await exercisesService.getExerciseById(id, userId);

    reply.code(200).send({
      success: true,
      data: exercise,
    });
  }

  /**
   * POST /api/exercises
   * Create custom exercise (user-owned)
   */
  async createCustomExercise(
    request: FastifyRequest<{ Body: CreateExerciseBody }>,
    reply: FastifyReply
  ): Promise<void> {
    const userId = request.user!.id; // Required auth

    const exercise = await exercisesService.createCustomExercise(
      request.body,
      userId
    );

    reply.code(201).send({
      success: true,
      message: 'Custom exercise created successfully',
      data: exercise,
    });
  }

  /**
   * POST /api/exercises/system
   * Create system exercise (admin only)
   */
  async createSystemExercise(
    request: FastifyRequest<{ Body: CreateExerciseBody }>,
    reply: FastifyReply
  ): Promise<void> {
    const exercise = await exercisesService.createSystemExercise(request.body);

    reply.code(201).send({
      success: true,
      message: 'System exercise created successfully',
      data: exercise,
    });
  }

  /**
   * PATCH /api/exercises/:id
   * Update exercise (own custom or admin)
   */
  async updateExercise(
    request: FastifyRequest<{
      Params: { id: string };
      Body: UpdateExerciseBody;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    const userId = request.user!.id;
    const isAdmin = ['admin', 'superadmin'].includes(request.user!.role);
    const id = parseInt(request.params.id, 10);

    const exercise = await exercisesService.updateExercise(
      id,
      request.body,
      userId,
      isAdmin
    );

    reply.code(200).send({
      success: true,
      message: 'Exercise updated successfully',
      data: exercise,
    });
  }

  /**
   * DELETE /api/exercises/:id
   * Delete exercise (own custom or admin)
   */
  async deleteExercise(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const userId = request.user!.id;
    const isAdmin = ['admin', 'superadmin'].includes(request.user!.role);
    const id = parseInt(request.params.id, 10);

    await exercisesService.deleteExercise(id, userId, isAdmin);

    reply.code(200).send({
      success: true,
      message: 'Exercise deleted successfully',
    });
  }
}

export const exercisesController = new ExercisesController();

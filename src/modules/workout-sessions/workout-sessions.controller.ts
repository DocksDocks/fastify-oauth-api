import type { FastifyRequest, FastifyReply } from 'fastify';
import { workoutSessionsService } from './workout-sessions.service';
import type {
  ListSessionsQuery,
  StartSessionBody,
  LogSetBody,
  CompleteSessionBody,
  CreateManualSessionBody,
} from './workout-sessions.types';

export class WorkoutSessionsController {
  /**
   * POST /api/sessions/start
   * Start a live workout session
   */
  async startSession(
    request: FastifyRequest<{ Body: StartSessionBody }>,
    reply: FastifyReply
  ): Promise<void> {
    const userId = request.user!.id;

    const session = await workoutSessionsService.startSession(request.body, userId);

    reply.code(201).send({
      success: true,
      message: 'Workout session started successfully',
      data: session,
    });
  }

  /**
   * POST /api/sessions/:id/sets
   * Log a set during a workout session
   */
  async logSet(
    request: FastifyRequest<{
      Params: { id: string };
      Body: LogSetBody;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    const userId = request.user!.id;
    const sessionId = parseInt(request.params.id, 10);

    const result = await workoutSessionsService.logSet(sessionId, request.body, userId);

    reply.code(201).send({
      success: true,
      message: 'Set logged successfully',
      data: result,
    });
  }

  /**
   * PATCH /api/sessions/:id/complete
   * Mark a session as complete
   */
  async completeSession(
    request: FastifyRequest<{
      Params: { id: string };
      Body: CompleteSessionBody;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    const userId = request.user!.id;
    const sessionId = parseInt(request.params.id, 10);

    const session = await workoutSessionsService.completeSession(
      sessionId,
      request.body,
      userId
    );

    reply.code(200).send({
      success: true,
      message: 'Workout session completed successfully',
      data: session,
    });
  }

  /**
   * PATCH /api/sessions/:id/abandon
   * Abandon a workout session
   */
  async abandonSession(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const userId = request.user!.id;
    const sessionId = parseInt(request.params.id, 10);

    await workoutSessionsService.abandonSession(sessionId, userId);

    reply.code(200).send({
      success: true,
      message: 'Workout session abandoned successfully',
    });
  }

  /**
   * POST /api/sessions/manual
   * Create a manual workout session (retrospective logging)
   */
  async createManualSession(
    request: FastifyRequest<{ Body: CreateManualSessionBody }>,
    reply: FastifyReply
  ): Promise<void> {
    const userId = request.user!.id;

    const session = await workoutSessionsService.createManualSession(request.body, userId);

    reply.code(201).send({
      success: true,
      message: 'Manual workout session created successfully',
      data: session,
    });
  }

  /**
   * GET /api/sessions
   * List user's workout sessions
   */
  async listSessions(
    request: FastifyRequest<{ Querystring: ListSessionsQuery }>,
    reply: FastifyReply
  ): Promise<void> {
    const userId = request.user!.id;

    const result = await workoutSessionsService.listSessions(request.query, userId);

    reply.code(200).send({
      success: true,
      data: result,
    });
  }

  /**
   * GET /api/sessions/:id
   * Get session by ID with full details
   */
  async getSessionById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const userId = request.user!.id;
    const sessionId = parseInt(request.params.id, 10);

    const session = await workoutSessionsService.getSessionById(sessionId, userId);

    reply.code(200).send({
      success: true,
      data: session,
    });
  }

  /**
   * DELETE /api/sessions/:id
   * Delete a workout session
   */
  async deleteSession(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const userId = request.user!.id;
    const sessionId = parseInt(request.params.id, 10);

    await workoutSessionsService.deleteSession(sessionId, userId);

    reply.code(200).send({
      success: true,
      message: 'Workout session deleted successfully',
    });
  }
}

export const workoutSessionsController = new WorkoutSessionsController();

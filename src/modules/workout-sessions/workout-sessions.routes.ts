import type { FastifyInstance } from 'fastify';
import { workoutSessionsController } from './workout-sessions.controller';

export async function workoutSessionsRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/sessions/start
   * Start a live workout session
   * Auth: Required (user+)
   */
  fastify.post(
    '/start',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Start a live workout session',
        tags: ['workout-sessions'],
        body: {
          type: 'object',
          required: ['workoutId'],
          properties: {
            workoutId: { type: 'integer' },
            startedAt: { type: 'string', format: 'date-time' },
            bodyweight: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
    },
    async (request, reply) => workoutSessionsController.startSession(request as any, reply)
  );

  /**
   * POST /api/sessions/manual
   * Create a manual workout session (retrospective logging)
   * Auth: Required (user+)
   */
  fastify.post(
    '/manual',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Create a manual workout session',
        tags: ['workout-sessions'],
        body: {
          type: 'object',
          required: ['performedAt', 'exercises'],
          properties: {
            workoutId: { type: 'integer' },
            workoutName: { type: 'string' },
            performedAt: { type: 'string', format: 'date-time' },
            durationMinutes: { type: 'integer', minimum: 0 },
            bodyweight: { type: 'string' },
            rating: { type: 'integer', minimum: 1, maximum: 5 },
            notes: { type: 'string' },
            exercises: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                required: ['exerciseId', 'sets'],
                properties: {
                  exerciseId: { type: 'integer' },
                  sets: {
                    type: 'array',
                    minItems: 1,
                    items: {
                      type: 'object',
                      required: ['setType', 'setNumberWithinType', 'reps'],
                      properties: {
                        setType: { type: 'string', enum: ['warmup', 'prep', 'working'] },
                        setNumberWithinType: { type: 'integer', minimum: 1 },
                        reps: { type: 'integer', minimum: 1 },
                        weight: { type: 'string' },
                        rpe: { type: 'integer', minimum: 1, maximum: 10 },
                        notes: { type: 'string' },
                        isFailure: { type: 'boolean' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
    },
    async (request, reply) => workoutSessionsController.createManualSession(request as any, reply)
  );

  /**
   * GET /api/sessions
   * List user's workout sessions
   * Auth: Required (user+)
   */
  fastify.get(
    '/',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'List workout sessions with filtering',
        tags: ['workout-sessions'],
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['in_progress', 'completed', 'abandoned'] },
            sessionType: { type: 'string', enum: ['live', 'manual'] },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
    },
    async (request, reply) => workoutSessionsController.listSessions(request as any, reply)
  );

  /**
   * GET /api/sessions/:id
   * Get session by ID
   * Auth: Required (user+)
   */
  fastify.get(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Get workout session by ID',
        tags: ['workout-sessions'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
    },
    async (request, reply) => workoutSessionsController.getSessionById(request as any, reply)
  );

  /**
   * POST /api/sessions/:id/sets
   * Log a set during a workout session
   * Auth: Required (user+)
   */
  fastify.post(
    '/:id/sets',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Log a set during workout',
        tags: ['workout-sessions'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['exerciseId', 'setType', 'setNumberWithinType', 'reps'],
          properties: {
            exerciseId: { type: 'integer' },
            setType: { type: 'string', enum: ['warmup', 'prep', 'working'] },
            setNumberWithinType: { type: 'integer', minimum: 1 },
            reps: { type: 'integer', minimum: 1 },
            weight: { type: 'string' },
            rpe: { type: 'integer', minimum: 1, maximum: 10 },
            restSeconds: { type: 'integer', minimum: 0 },
            notes: { type: 'string' },
            isFailure: { type: 'boolean' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
    },
    async (request, reply) => workoutSessionsController.logSet(request as any, reply)
  );

  /**
   * PATCH /api/sessions/:id/complete
   * Mark a session as complete
   * Auth: Required (user+)
   */
  fastify.patch(
    '/:id/complete',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Complete a workout session',
        tags: ['workout-sessions'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            completedAt: { type: 'string', format: 'date-time' },
            durationMinutes: { type: 'integer', minimum: 0 },
            rating: { type: 'integer', minimum: 1, maximum: 5 },
            notes: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
    },
    async (request, reply) => workoutSessionsController.completeSession(request as any, reply)
  );

  /**
   * PATCH /api/sessions/:id/abandon
   * Abandon a workout session
   * Auth: Required (user+)
   */
  fastify.patch(
    '/:id/abandon',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Abandon a workout session',
        tags: ['workout-sessions'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => workoutSessionsController.abandonSession(request as any, reply)
  );

  /**
   * DELETE /api/sessions/:id
   * Delete a workout session
   * Auth: Required (user+)
   */
  fastify.delete(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Delete a workout session',
        tags: ['workout-sessions'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => workoutSessionsController.deleteSession(request as any, reply)
  );
}

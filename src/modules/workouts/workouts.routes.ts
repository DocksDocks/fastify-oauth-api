import type { FastifyInstance } from 'fastify';
import { workoutsController } from './workouts.controller';

export async function workoutsRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/workouts
   * List workouts accessible to the user
   * Auth: Required (user+)
   */
  fastify.get(
    '/',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'List accessible workouts with filtering',
        tags: ['workouts'],
        querystring: {
          type: 'object',
          properties: {
            isTemplate: { type: 'boolean' },
            isPublic: { type: 'boolean' },
            difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
            search: { type: 'string' },
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                additionalProperties: true
              },
            },
          },
        },
      },
    },
    async (request, reply) => workoutsController.listWorkouts(request as any, reply)
  );

  /**
   * GET /api/workouts/shared/with-me
   * List workouts shared with me
   * Auth: Required (user+)
   * NOTE: Must come BEFORE /:id route
   */
  fastify.get(
    '/shared/with-me',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'List workouts shared with current user',
        tags: ['workouts', 'sharing'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: true
                }
              },
            },
          },
        },
      },
    },
    async (request, reply) => workoutsController.listSharedWorkouts(request as any, reply)
  );

  /**
   * GET /api/workouts/:id
   * Get workout by ID
   * Auth: Required (user+, must have access)
   */
  fastify.get(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Get workout by ID',
        tags: ['workouts'],
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
              data: {
                type: 'object',
                additionalProperties: true
              },
            },
          },
        },
      },
    },
    async (request, reply) => workoutsController.getWorkoutById(request as any, reply)
  );

  /**
   * POST /api/workouts
   * Create a new workout
   * Auth: Required (user+)
   */
  fastify.post(
    '/',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Create a new workout',
        tags: ['workouts'],
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string' },
            isTemplate: { type: 'boolean' },
            isPublic: { type: 'boolean' },
            difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
            duration: { type: 'integer', minimum: 0 },
            tags: { type: 'array', items: { type: 'string' } },
            exercises: {
              type: 'array',
              items: {
                type: 'object',
                required: ['exerciseId', 'orderIndex'],
                properties: {
                  exerciseId: { type: 'integer' },
                  orderIndex: { type: 'integer', minimum: 0 },
                  reps: { type: 'integer', minimum: 1 },
                  weight: { type: 'string' },
                  notes: { type: 'string' },
                  warmupSetsCount: { type: 'integer', minimum: 0, maximum: 10 },
                  warmupRestSeconds: { type: 'integer', minimum: 0, maximum: 3600 },
                  prepSetsCount: { type: 'integer', minimum: 0, maximum: 10 },
                  prepRestSeconds: { type: 'integer', minimum: 0, maximum: 3600 },
                  workingSetsCount: { type: 'integer', minimum: 0, maximum: 10 },
                  workingRestSeconds: { type: 'integer', minimum: 0, maximum: 3600 },
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
              data: {
                type: 'object',
                additionalProperties: true
              },
            },
          },
        },
      },
    },
    async (request, reply) => workoutsController.createWorkout(request as any, reply)
  );

  /**
   * PATCH /api/workouts/:id
   * Update a workout
   * Auth: Required (owner only)
   */
  fastify.patch(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Update workout (owner only)',
        tags: ['workouts'],
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
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string' },
            isTemplate: { type: 'boolean' },
            isPublic: { type: 'boolean' },
            isLocked: { type: 'boolean' },
            difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
            duration: { type: 'integer', minimum: 0 },
            tags: { type: 'array', items: { type: 'string' } },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                additionalProperties: true
              },
            },
          },
        },
      },
    },
    async (request, reply) => workoutsController.updateWorkout(request as any, reply)
  );

  /**
   * DELETE /api/workouts/:id
   * Delete a workout
   * Auth: Required (owner only)
   */
  fastify.delete(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Delete workout (owner only)',
        tags: ['workouts'],
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
    async (request, reply) => workoutsController.deleteWorkout(request as any, reply)
  );

  /**
   * POST /api/workouts/:id/exercises
   * Add exercises to a workout
   * Auth: Required (owner only)
   */
  fastify.post(
    '/:id/exercises',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Add exercises to workout',
        tags: ['workouts'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['exercises'],
          properties: {
            exercises: {
              type: 'array',
              items: {
                type: 'object',
                required: ['exerciseId', 'orderIndex'],
                properties: {
                  exerciseId: { type: 'integer' },
                  orderIndex: { type: 'integer', minimum: 0 },
                  reps: { type: 'integer', minimum: 1 },
                  weight: { type: 'string' },
                  notes: { type: 'string' },
                  warmupSetsCount: { type: 'integer', minimum: 0, maximum: 10 },
                  warmupRestSeconds: { type: 'integer', minimum: 0, maximum: 3600 },
                  prepSetsCount: { type: 'integer', minimum: 0, maximum: 10 },
                  prepRestSeconds: { type: 'integer', minimum: 0, maximum: 3600 },
                  workingSetsCount: { type: 'integer', minimum: 0, maximum: 10 },
                  workingRestSeconds: { type: 'integer', minimum: 0, maximum: 3600 },
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
            },
          },
        },
      },
    },
    async (request, reply) => workoutsController.addExercisesToWorkout(request as any, reply)
  );

  /**
   * DELETE /api/workouts/:id/exercises/:exerciseId
   * Remove an exercise from a workout
   * Auth: Required (owner only)
   */
  fastify.delete(
    '/:id/exercises/:exerciseId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Remove exercise from workout',
        tags: ['workouts'],
        params: {
          type: 'object',
          required: ['id', 'exerciseId'],
          properties: {
            id: { type: 'string' },
            exerciseId: { type: 'string' },
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
    async (request, reply) => workoutsController.removeExerciseFromWorkout(request as any, reply)
  );

  /**
   * POST /api/workouts/:id/share
   * Share a workout with another user
   * Auth: Required (owner only)
   */
  fastify.post(
    '/:id/share',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Share workout with another user',
        tags: ['workouts', 'sharing'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['sharedWithId'],
          properties: {
            sharedWithId: { type: 'integer' },
            permission: { type: 'string', enum: ['view', 'copy'], default: 'view' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                additionalProperties: true
              },
            },
          },
        },
      },
    },
    async (request, reply) => workoutsController.shareWorkout(request as any, reply)
  );

  /**
   * DELETE /api/workouts/:id/share/:sharedWithId
   * Unshare a workout
   * Auth: Required (owner only)
   */
  fastify.delete(
    '/:id/share/:sharedWithId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Unshare workout',
        tags: ['workouts', 'sharing'],
        params: {
          type: 'object',
          required: ['id', 'sharedWithId'],
          properties: {
            id: { type: 'string' },
            sharedWithId: { type: 'string' },
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
    async (request, reply) => workoutsController.unshareWorkout(request as any, reply)
  );
}

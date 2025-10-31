import type { FastifyInstance } from 'fastify';
import { exercisesController } from './exercises.controller';
import { requireAdmin } from '@/middleware/authorize';
import { optionalAuth } from '@/middleware/authorize';

export async function exercisesRoutes(fastify: FastifyInstance): Promise<void> {
  // Optional auth helper - try to authenticate but don't fail if no token
  const tryAuth = { preHandler: optionalAuth };

  /**
   * GET /api/exercises
   * List exercises with filtering and pagination
   * Auth: Optional (shows only public if not authenticated)
   */
  fastify.get(
    '/',
    {
      ...tryAuth,
      schema: {
        description: 'List exercises with filtering and pagination',
        tags: ['exercises'],
        querystring: {
          type: 'object',
          properties: {
            category: { type: 'string', enum: ['strength', 'cardio', 'flexibility', 'other'] },
            muscleGroup: {
              type: 'string',
              enum: ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'full_body'],
            },
            search: { type: 'string' },
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            onlyPublic: { type: 'boolean' },
          },
        },
        // Remove response schema validation - let Fastify serialize naturally
      },
    },
    async (request, reply) => exercisesController.listExercises(request as any, reply)
  );

  /**
   * GET /api/exercises/:code
   * Get exercise by code
   * Auth: Optional (shows only public if not authenticated)
   */
  fastify.get(
    '/:code',
    {
      ...tryAuth,
      schema: {
        description: 'Get exercise by code',
        tags: ['exercises'],
        params: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string' },
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
    async (request, reply) => exercisesController.getExerciseByCode(request as any, reply)
  );

  /**
   * GET /api/exercises/id/:id
   * Get exercise by ID
   * Auth: Optional (shows only public if not authenticated)
   */
  fastify.get(
    '/id/:id',
    {
      ...tryAuth,
      schema: {
        description: 'Get exercise by ID',
        tags: ['exercises'],
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
    async (request, reply) => exercisesController.getExerciseById(request as any, reply)
  );

  /**
   * POST /api/exercises
   * Create custom exercise (user-owned)
   * Auth: Required (user+)
   */
  fastify.post(
    '/',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Create custom exercise',
        tags: ['exercises'],
        body: {
          type: 'object',
          required: ['code', 'name', 'category', 'muscleGroup'],
          properties: {
            code: { type: 'string', minLength: 1, maxLength: 100 },
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string' },
            category: { type: 'string', enum: ['strength', 'cardio', 'flexibility', 'other'] },
            muscleGroup: {
              type: 'string',
              enum: ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'full_body'],
            },
            equipment: { type: 'string', maxLength: 100 },
            videoUrl: { type: 'string' },
            instructions: { type: 'string' },
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
    async (request, reply) => exercisesController.createCustomExercise(request as any, reply)
  );

  /**
   * POST /api/exercises/system
   * Create system exercise
   * Auth: Required (admin+)
   */
  fastify.post(
    '/system',
    {
      preHandler: [fastify.authenticate, requireAdmin],
      schema: {
        description: 'Create system exercise (admin only)',
        tags: ['exercises', 'admin'],
        body: {
          type: 'object',
          required: ['code', 'name', 'category', 'muscleGroup'],
          properties: {
            code: { type: 'string', minLength: 1, maxLength: 100 },
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string' },
            category: { type: 'string', enum: ['strength', 'cardio', 'flexibility', 'other'] },
            muscleGroup: {
              type: 'string',
              enum: ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'full_body'],
            },
            equipment: { type: 'string', maxLength: 100 },
            videoUrl: { type: 'string' },
            instructions: { type: 'string' },
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
    async (request, reply) => exercisesController.createSystemExercise(request as any, reply)
  );

  /**
   * PATCH /api/exercises/:id
   * Update exercise
   * Auth: Required (user+ for own custom, admin+ for any)
   */
  fastify.patch(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Update exercise (own custom or admin)',
        tags: ['exercises'],
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
            category: { type: 'string', enum: ['strength', 'cardio', 'flexibility', 'other'] },
            muscleGroup: {
              type: 'string',
              enum: ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'full_body'],
            },
            equipment: { type: 'string', maxLength: 100 },
            videoUrl: { type: 'string' },
            instructions: { type: 'string' },
            isPublic: { type: 'boolean' }, // Only for admins
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
    async (request, reply) => exercisesController.updateExercise(request as any, reply)
  );

  /**
   * DELETE /api/exercises/:id
   * Delete exercise
   * Auth: Required (user+ for own custom, admin+ for any non-system)
   */
  fastify.delete(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Delete exercise (own custom or admin)',
        tags: ['exercises'],
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
    async (request, reply) => exercisesController.deleteExercise(request as any, reply)
  );
}

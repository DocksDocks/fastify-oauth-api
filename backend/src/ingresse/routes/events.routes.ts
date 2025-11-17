/**
 * Events Routes
 * Public routes for event discovery (API key only)
 */

import type { FastifyInstance } from 'fastify';
import {
  handleGetAllEvents,
  handleGetEventDetails,
} from '../controllers/events.controller';

export default async function eventsRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/tickets/events - Get all active events
  fastify.get('/', {
    handler: handleGetAllEvents,
  });

  // GET /api/tickets/events/:eventId - Get event details
  fastify.get('/:eventId', {
    handler: handleGetEventDetails,
  });
}

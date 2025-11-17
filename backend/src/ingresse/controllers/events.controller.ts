/**
 * Events Controller
 * Handles event discovery endpoints (public - API key only)
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { getAllEvents, getEventDetails } from '../services/ingresse-api.service';

/**
 * Get all active events from Backstage
 * @route GET /api/tickets/events
 * @access Public (API key only)
 */
export async function handleGetAllEvents(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const events = await getAllEvents();

  return reply.send({
    success: true,
    data: events,
  });
}

/**
 * Get event details by ID
 * @route GET /api/tickets/events/:eventId
 * @access Public (API key only)
 */
export async function handleGetEventDetails(
  request: FastifyRequest<{
    Params: { eventId: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const eventId = parseInt(request.params.eventId, 10);

  if (isNaN(eventId)) {
    return reply.code(400).send({
      success: false,
      error: {
        code: 'INVALID_EVENT_ID',
        message: 'ID do evento inv\u00e1lido',
      },
    });
  }

  const eventDetails = await getEventDetails(eventId);

  return reply.send({
    success: true,
    data: eventDetails,
  });
}

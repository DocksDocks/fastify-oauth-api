/**
 * Wallet Controller
 * Handles wallet and ticket management endpoints (protected - JWT + Ingresse account required)
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  getUserWallet,
  getUserPastTickets,
  getUserTickets,
  getPendingTransfers,
  searchTransferUser,
  transferTicket,
  performTransferAction,
  returnTicket,
} from '../services/ingresse-api.service';
import type { TransferTicketRequest } from '../types/wallet.types';

/**
 * Get user's wallet (upcoming tickets)
 * @route GET /api/tickets/wallet
 * @access Protected (JWT + Ingresse account)
 */
export async function handleGetWallet(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const userToken = request.ingresseToken!;
  const userId = request.ingresseUserId!;

  const wallet = await getUserWallet(userId, userToken);

  return reply.send({
    success: true,
    data: wallet,
  });
}

/**
 * Get user's past tickets
 * @route GET /api/tickets/wallet/past-tickets
 * @access Protected (JWT + Ingresse account)
 */
export async function handleGetPastTickets(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const userToken = request.ingresseToken!;
  const userId = request.ingresseUserId!;

  const pastTickets = await getUserPastTickets(userId, userToken);

  return reply.send({
    success: true,
    data: pastTickets,
  });
}

/**
 * Get user's tickets for a specific event
 * @route GET /api/tickets/wallet/tickets?eventId=123
 * @access Protected (JWT + Ingresse account)
 */
export async function handleGetTickets(
  request: FastifyRequest<{
    Querystring: { eventId?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const { eventId } = request.query;

  if (!eventId) {
    return reply.code(400).send({
      success: false,
      error: {
        code: 'MISSING_EVENT_ID',
        message: 'ID do evento \u00e9 obrigat\u00f3rio',
      },
    });
  }

  const eventIdNum = parseInt(eventId, 10);
  if (isNaN(eventIdNum)) {
    return reply.code(400).send({
      success: false,
      error: {
        code: 'INVALID_EVENT_ID',
        message: 'ID do evento inv\u00e1lido',
      },
    });
  }

  const userToken = request.ingresseToken!;
  const userId = request.ingresseUserId!;

  const tickets = await getUserTickets(userId, eventIdNum, userToken);

  return reply.send({
    success: true,
    data: tickets,
  });
}

/**
 * Get pending ticket transfers
 * @route GET /api/tickets/wallet/pending-transfers
 * @access Protected (JWT + Ingresse account)
 */
export async function handleGetPendingTransfers(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const userToken = request.ingresseToken!;
  const userId = request.ingresseUserId!;

  const transfers = await getPendingTransfers(userId, userToken);

  return reply.send({
    success: true,
    data: transfers,
  });
}

/**
 * Search for user to transfer ticket to
 * @route GET /api/tickets/wallet/search/transfer?email=user@example.com
 * @access Protected (JWT + Ingresse account)
 */
export async function handleSearchTransferUser(
  request: FastifyRequest<{
    Querystring: { email?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const { email } = request.query;

  if (!email) {
    return reply.code(400).send({
      success: false,
      error: {
        code: 'MISSING_EMAIL',
        message: 'Email \u00e9 obrigat\u00f3rio para busca',
      },
    });
  }

  const userToken = request.ingresseToken!;

  const users = await searchTransferUser(email, userToken);

  return reply.send({
    success: true,
    data: users,
  });
}

/**
 * Transfer a ticket to another user
 * @route POST /api/tickets/wallet/tickets/:ticketId/transfer
 * @access Protected (JWT + Ingresse account)
 */
export async function handleTransferTicket(
  request: FastifyRequest<{
    Params: { ticketId: string };
    Body: TransferTicketRequest;
  }>,
  reply: FastifyReply
): Promise<void> {
  const ticketId = parseInt(request.params.ticketId, 10);

  if (isNaN(ticketId)) {
    return reply.code(400).send({
      success: false,
      error: {
        code: 'INVALID_TICKET_ID',
        message: 'ID do ingresso inv\u00e1lido',
      },
    });
  }

  const userToken = request.ingresseToken!;
  const transferData = request.body;

  const result = await transferTicket(ticketId, transferData, userToken);

  return reply.send({
    success: true,
    data: result,
  });
}

/**
 * Perform transfer action (cancel/accept/refuse)
 * @route POST /api/tickets/wallet/tickets/:ticketId/transfer/:transferId
 * @access Protected (JWT + Ingresse account)
 */
export async function handleTransferAction(
  request: FastifyRequest<{
    Params: { ticketId: string; transferId: string };
    Querystring: { action?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const ticketId = parseInt(request.params.ticketId, 10);
  const transferId = parseInt(request.params.transferId, 10);
  const { action } = request.query;

  if (isNaN(ticketId)) {
    return reply.code(400).send({
      success: false,
      error: {
        code: 'INVALID_TICKET_ID',
        message: 'ID do ingresso inv\u00e1lido',
      },
    });
  }

  if (isNaN(transferId)) {
    return reply.code(400).send({
      success: false,
      error: {
        code: 'INVALID_TRANSFER_ID',
        message: 'ID da transfer\u00eancia inv\u00e1lido',
      },
    });
  }

  if (!action || !['cancel', 'accept', 'refuse'].includes(action)) {
    return reply.code(400).send({
      success: false,
      error: {
        code: 'INVALID_ACTION',
        message: 'A\u00e7\u00e3o inv\u00e1lida. Use: cancel, accept ou refuse',
      },
    });
  }

  const userToken = request.ingresseToken!;

  const result = await performTransferAction(
    ticketId,
    transferId,
    action as 'cancel' | 'accept' | 'refuse',
    userToken
  );

  return reply.send({
    success: true,
    data: result,
  });
}

/**
 * Return a ticket
 * @route POST /api/tickets/wallet/tickets/:ticketId/return
 * @access Protected (JWT + Ingresse account)
 */
export async function handleReturnTicket(
  request: FastifyRequest<{
    Params: { ticketId: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const ticketId = parseInt(request.params.ticketId, 10);

  if (isNaN(ticketId)) {
    return reply.code(400).send({
      success: false,
      error: {
        code: 'INVALID_TICKET_ID',
        message: 'ID do ingresso inv\u00e1lido',
      },
    });
  }

  const userToken = request.ingresseToken!;

  const result = await returnTicket(ticketId, userToken);

  return reply.send({
    success: true,
    data: result,
  });
}

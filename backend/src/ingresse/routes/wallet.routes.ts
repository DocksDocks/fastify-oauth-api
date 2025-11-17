/**
 * Wallet Routes
 * Protected routes for wallet and ticket management (JWT + Ingresse account required)
 */

import type { FastifyInstance } from 'fastify';
import { requireIngresseAccount } from '../middleware/require-ingresse-account';
import {
  handleGetWallet,
  handleGetPastTickets,
  handleGetTickets,
  handleGetPendingTransfers,
  handleSearchTransferUser,
  handleTransferTicket,
  handleTransferAction,
  handleReturnTicket,
} from '../controllers/wallet.controller';

export default async function walletRoutes(fastify: FastifyInstance): Promise<void> {
  // All wallet routes require JWT authentication + Ingresse account
  fastify.addHook('onRequest', fastify.authenticate); // JWT authentication
  fastify.addHook('onRequest', requireIngresseAccount); // Ingresse account check

  // GET /api/tickets/wallet - Get user's wallet (upcoming tickets)
  fastify.get('/', {
    handler: handleGetWallet,
  });

  // GET /api/tickets/wallet/past-tickets - Get past tickets
  fastify.get('/past-tickets', {
    handler: handleGetPastTickets,
  });

  // GET /api/tickets/wallet/tickets?eventId=123 - Get tickets for specific event
  fastify.get('/tickets', {
    handler: handleGetTickets,
  });

  // GET /api/tickets/wallet/pending-transfers - Get pending transfers
  fastify.get('/pending-transfers', {
    handler: handleGetPendingTransfers,
  });

  // GET /api/tickets/wallet/search/transfer?email=user@example.com - Search user to transfer to
  fastify.get('/search/transfer', {
    handler: handleSearchTransferUser,
  });

  // POST /api/tickets/wallet/tickets/:ticketId/transfer - Transfer ticket
  fastify.post('/tickets/:ticketId/transfer', {
    handler: handleTransferTicket,
  });

  // POST /api/tickets/wallet/tickets/:ticketId/transfer/:transferId?action=cancel - Transfer action
  fastify.post('/tickets/:ticketId/transfer/:transferId', {
    handler: handleTransferAction,
  });

  // POST /api/tickets/wallet/tickets/:ticketId/return - Return ticket
  fastify.post('/tickets/:ticketId/return', {
    handler: handleReturnTicket,
  });
}

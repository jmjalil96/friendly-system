import { Router } from 'express'
import {
  API_ROUTES,
  clientPoliciesParamsSchema,
  clientPoliciesQuerySchema,
  clientTimelineParamsSchema,
  clientTimelineQuerySchema,
  createClientSchema,
  deleteClientParamsSchema,
  getClientByIdParamsSchema,
  listClientsQuerySchema,
  updateClientParamsSchema,
  updateClientSchema,
} from '@friendly-system/shared'
import { validate } from '../../shared/middleware/validate.js'
import { requireAuth } from '../../shared/middleware/require-auth.js'
import { requirePermission } from '../../shared/middleware/require-permission.js'
import {
  createClientHandler,
  deleteClientHandler,
  getClientByIdHandler,
  getClientTimelineHandler,
  listClientPoliciesHandler,
  listClientsHandler,
  updateClientHandler,
} from './clients.handler.js'

export const clientsRoutes = Router()

clientsRoutes.post(
  API_ROUTES.clients.create,
  requireAuth,
  requirePermission('clients:create'),
  validate({ body: createClientSchema }),
  createClientHandler,
)

clientsRoutes.get(
  API_ROUTES.clients.list,
  requireAuth,
  requirePermission('clients:read'),
  validate({ query: listClientsQuerySchema }),
  listClientsHandler,
)

clientsRoutes.get(
  API_ROUTES.clients.timeline,
  requireAuth,
  requirePermission('clients:read'),
  validate({
    params: clientTimelineParamsSchema,
    query: clientTimelineQuerySchema,
  }),
  getClientTimelineHandler,
)

clientsRoutes.get(
  API_ROUTES.clients.policies,
  requireAuth,
  requirePermission('clients:read'),
  validate({
    params: clientPoliciesParamsSchema,
    query: clientPoliciesQuerySchema,
  }),
  listClientPoliciesHandler,
)

clientsRoutes.get(
  API_ROUTES.clients.getById,
  requireAuth,
  requirePermission('clients:read'),
  validate({ params: getClientByIdParamsSchema }),
  getClientByIdHandler,
)

clientsRoutes.patch(
  API_ROUTES.clients.update,
  requireAuth,
  requirePermission('clients:update'),
  validate({ params: updateClientParamsSchema, body: updateClientSchema }),
  updateClientHandler,
)

clientsRoutes.delete(
  API_ROUTES.clients.delete,
  requireAuth,
  requirePermission('clients:update'),
  validate({ params: deleteClientParamsSchema }),
  deleteClientHandler,
)

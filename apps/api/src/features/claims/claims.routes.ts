import { Router } from 'express'
import {
  API_ROUTES,
  claimHistoryParamsSchema,
  claimHistoryQuerySchema,
  claimInvoiceByIdParamsSchema,
  claimInvoicesParamsSchema,
  claimInvoicesQuerySchema,
  claimTimelineParamsSchema,
  claimTimelineQuerySchema,
  createClaimInvoiceSchema,
  createClaimSchema,
  deleteClaimParamsSchema,
  getClaimByIdParamsSchema,
  lookupAffiliatePatientsParamsSchema,
  lookupClientAffiliatesParamsSchema,
  lookupClientAffiliatesQuerySchema,
  lookupClientPoliciesParamsSchema,
  lookupClientPoliciesQuerySchema,
  lookupClientsQuerySchema,
  listClaimsQuerySchema,
  transitionClaimParamsSchema,
  transitionClaimSchema,
  updateClaimInvoiceSchema,
  updateClaimParamsSchema,
  updateClaimSchema,
} from '@friendly-system/shared'
import { validate } from '../../shared/middleware/validate.js'
import { requireAuth } from '../../shared/middleware/require-auth.js'
import { requirePermission } from '../../shared/middleware/require-permission.js'
import {
  createClaimInvoiceHandler,
  createClaimHandler,
  deleteClaimHandler,
  deleteClaimInvoiceHandler,
  getClaimHistoryHandler,
  getClaimInvoiceHandler,
  getClaimTimelineHandler,
  lookupAffiliatePatientsHandler,
  lookupClientAffiliatesHandler,
  lookupClientPoliciesHandler,
  lookupClientsHandler,
  getClaimByIdHandler,
  listClaimInvoicesHandler,
  listClaimsHandler,
  transitionClaimHandler,
  updateClaimInvoiceHandler,
  updateClaimHandler,
} from './claims.handler.js'

export const claimsRoutes = Router()

claimsRoutes.post(
  API_ROUTES.claims.create,
  requireAuth,
  requirePermission('claims:create'),
  validate({ body: createClaimSchema }),
  createClaimHandler,
)

claimsRoutes.get(
  API_ROUTES.claims.list,
  requireAuth,
  requirePermission('claims:read'),
  validate({ query: listClaimsQuerySchema }),
  listClaimsHandler,
)

claimsRoutes.get(
  API_ROUTES.claims.lookupClients,
  requireAuth,
  requirePermission('claims:read'),
  validate({ query: lookupClientsQuerySchema }),
  lookupClientsHandler,
)

claimsRoutes.get(
  API_ROUTES.claims.lookupClientAffiliates,
  requireAuth,
  requirePermission('claims:read'),
  validate({
    params: lookupClientAffiliatesParamsSchema,
    query: lookupClientAffiliatesQuerySchema,
  }),
  lookupClientAffiliatesHandler,
)

claimsRoutes.get(
  API_ROUTES.claims.lookupAffiliatePatients,
  requireAuth,
  requirePermission('claims:read'),
  validate({ params: lookupAffiliatePatientsParamsSchema }),
  lookupAffiliatePatientsHandler,
)

claimsRoutes.get(
  API_ROUTES.claims.lookupClientPolicies,
  requireAuth,
  requirePermission('claims:read'),
  validate({
    params: lookupClientPoliciesParamsSchema,
    query: lookupClientPoliciesQuerySchema,
  }),
  lookupClientPoliciesHandler,
)

claimsRoutes.get(
  API_ROUTES.claims.history,
  requireAuth,
  requirePermission('claims:read'),
  validate({
    params: claimHistoryParamsSchema,
    query: claimHistoryQuerySchema,
  }),
  getClaimHistoryHandler,
)

claimsRoutes.get(
  API_ROUTES.claims.timeline,
  requireAuth,
  requirePermission('claims:read'),
  validate({
    params: claimTimelineParamsSchema,
    query: claimTimelineQuerySchema,
  }),
  getClaimTimelineHandler,
)

claimsRoutes.get(
  API_ROUTES.claims.invoices,
  requireAuth,
  requirePermission('claims:read'),
  validate({
    params: claimInvoicesParamsSchema,
    query: claimInvoicesQuerySchema,
  }),
  listClaimInvoicesHandler,
)

claimsRoutes.get(
  API_ROUTES.claims.invoiceById,
  requireAuth,
  requirePermission('claims:read'),
  validate({
    params: claimInvoiceByIdParamsSchema,
  }),
  getClaimInvoiceHandler,
)

claimsRoutes.get(
  API_ROUTES.claims.getById,
  requireAuth,
  requirePermission('claims:read'),
  validate({ params: getClaimByIdParamsSchema }),
  getClaimByIdHandler,
)

claimsRoutes.patch(
  API_ROUTES.claims.update,
  requireAuth,
  requirePermission('claims:update'),
  validate({ params: updateClaimParamsSchema, body: updateClaimSchema }),
  updateClaimHandler,
)

claimsRoutes.post(
  API_ROUTES.claims.invoices,
  requireAuth,
  requirePermission('claims:update'),
  validate({
    params: claimInvoicesParamsSchema,
    body: createClaimInvoiceSchema,
  }),
  createClaimInvoiceHandler,
)

claimsRoutes.patch(
  API_ROUTES.claims.invoiceById,
  requireAuth,
  requirePermission('claims:update'),
  validate({
    params: claimInvoiceByIdParamsSchema,
    body: updateClaimInvoiceSchema,
  }),
  updateClaimInvoiceHandler,
)

claimsRoutes.delete(
  API_ROUTES.claims.invoiceById,
  requireAuth,
  requirePermission('claims:update'),
  validate({
    params: claimInvoiceByIdParamsSchema,
  }),
  deleteClaimInvoiceHandler,
)

claimsRoutes.post(
  API_ROUTES.claims.transition,
  requireAuth,
  requirePermission('claims:transition'),
  validate({
    params: transitionClaimParamsSchema,
    body: transitionClaimSchema,
  }),
  transitionClaimHandler,
)

claimsRoutes.delete(
  API_ROUTES.claims.delete,
  requireAuth,
  requirePermission('claims:update'),
  validate({
    params: deleteClaimParamsSchema,
  }),
  deleteClaimHandler,
)

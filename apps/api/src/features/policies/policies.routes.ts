import { Router } from 'express'
import {
  API_ROUTES,
  createPolicySchema,
  deletePolicyParamsSchema,
  getPolicyByIdParamsSchema,
  listPoliciesQuerySchema,
  lookupPolicyClientsQuerySchema,
  lookupPolicyInsurersQuerySchema,
  policyHistoryParamsSchema,
  policyHistoryQuerySchema,
  policyTimelineParamsSchema,
  policyTimelineQuerySchema,
  transitionPolicyParamsSchema,
  transitionPolicySchema,
  updatePolicyParamsSchema,
  updatePolicySchema,
} from '@friendly-system/shared'
import { validate } from '../../shared/middleware/validate.js'
import { requireAuth } from '../../shared/middleware/require-auth.js'
import { requirePermission } from '../../shared/middleware/require-permission.js'
import {
  createPolicyHandler,
  deletePolicyHandler,
  getPolicyByIdHandler,
  getPolicyHistoryHandler,
  getPolicyTimelineHandler,
  listPoliciesHandler,
  lookupPolicyClientsHandler,
  lookupPolicyInsurersHandler,
  transitionPolicyHandler,
  updatePolicyHandler,
} from './policies.handler.js'

export const policiesRoutes = Router()

policiesRoutes.post(
  API_ROUTES.policies.create,
  requireAuth,
  requirePermission('policies:create'),
  validate({ body: createPolicySchema }),
  createPolicyHandler,
)

policiesRoutes.get(
  API_ROUTES.policies.list,
  requireAuth,
  requirePermission('policies:read'),
  validate({ query: listPoliciesQuerySchema }),
  listPoliciesHandler,
)

policiesRoutes.get(
  API_ROUTES.policies.lookupClients,
  requireAuth,
  requirePermission('policies:read'),
  validate({ query: lookupPolicyClientsQuerySchema }),
  lookupPolicyClientsHandler,
)

policiesRoutes.get(
  API_ROUTES.policies.lookupInsurers,
  requireAuth,
  requirePermission('policies:read'),
  validate({ query: lookupPolicyInsurersQuerySchema }),
  lookupPolicyInsurersHandler,
)

policiesRoutes.get(
  API_ROUTES.policies.history,
  requireAuth,
  requirePermission('policies:read'),
  validate({
    params: policyHistoryParamsSchema,
    query: policyHistoryQuerySchema,
  }),
  getPolicyHistoryHandler,
)

policiesRoutes.get(
  API_ROUTES.policies.timeline,
  requireAuth,
  requirePermission('policies:read'),
  validate({
    params: policyTimelineParamsSchema,
    query: policyTimelineQuerySchema,
  }),
  getPolicyTimelineHandler,
)

policiesRoutes.get(
  API_ROUTES.policies.getById,
  requireAuth,
  requirePermission('policies:read'),
  validate({ params: getPolicyByIdParamsSchema }),
  getPolicyByIdHandler,
)

policiesRoutes.patch(
  API_ROUTES.policies.update,
  requireAuth,
  requirePermission('policies:update'),
  validate({ params: updatePolicyParamsSchema, body: updatePolicySchema }),
  updatePolicyHandler,
)

policiesRoutes.post(
  API_ROUTES.policies.transition,
  requireAuth,
  requirePermission('policies:transition'),
  validate({
    params: transitionPolicyParamsSchema,
    body: transitionPolicySchema,
  }),
  transitionPolicyHandler,
)

policiesRoutes.delete(
  API_ROUTES.policies.delete,
  requireAuth,
  requirePermission('policies:update'),
  validate({
    params: deletePolicyParamsSchema,
  }),
  deletePolicyHandler,
)

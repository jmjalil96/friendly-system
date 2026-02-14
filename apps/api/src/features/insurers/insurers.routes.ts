import { Router } from 'express'
import {
  API_ROUTES,
  createInsurerSchema,
  deleteInsurerParamsSchema,
  getInsurerByIdParamsSchema,
  insurerTimelineParamsSchema,
  insurerTimelineQuerySchema,
  listInsurersQuerySchema,
  updateInsurerParamsSchema,
  updateInsurerSchema,
} from '@friendly-system/shared'
import { validate } from '../../shared/middleware/validate.js'
import { requireAuth } from '../../shared/middleware/require-auth.js'
import { requirePermission } from '../../shared/middleware/require-permission.js'
import {
  createInsurerHandler,
  deleteInsurerHandler,
  getInsurerByIdHandler,
  getInsurerTimelineHandler,
  listInsurersHandler,
  updateInsurerHandler,
} from './insurers.handler.js'

export const insurersRoutes = Router()

insurersRoutes.post(
  API_ROUTES.insurers.create,
  requireAuth,
  requirePermission('insurers:create'),
  validate({ body: createInsurerSchema }),
  createInsurerHandler,
)

insurersRoutes.get(
  API_ROUTES.insurers.list,
  requireAuth,
  requirePermission('insurers:read'),
  validate({ query: listInsurersQuerySchema }),
  listInsurersHandler,
)

insurersRoutes.get(
  API_ROUTES.insurers.timeline,
  requireAuth,
  requirePermission('insurers:read'),
  validate({
    params: insurerTimelineParamsSchema,
    query: insurerTimelineQuerySchema,
  }),
  getInsurerTimelineHandler,
)

insurersRoutes.get(
  API_ROUTES.insurers.getById,
  requireAuth,
  requirePermission('insurers:read'),
  validate({ params: getInsurerByIdParamsSchema }),
  getInsurerByIdHandler,
)

insurersRoutes.patch(
  API_ROUTES.insurers.update,
  requireAuth,
  requirePermission('insurers:update'),
  validate({
    params: updateInsurerParamsSchema,
    body: updateInsurerSchema,
  }),
  updateInsurerHandler,
)

insurersRoutes.delete(
  API_ROUTES.insurers.delete,
  requireAuth,
  requirePermission('insurers:update'),
  validate({ params: deleteInsurerParamsSchema }),
  deleteInsurerHandler,
)

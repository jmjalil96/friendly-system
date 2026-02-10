import { Router } from 'express'
import { API_ROUTES, createClaimSchema } from '@friendly-system/shared'
import { validate } from '../../shared/middleware/validate.js'
import { requireAuth } from '../../shared/middleware/require-auth.js'
import { requirePermission } from '../../shared/middleware/require-permission.js'
import { createClaimHandler } from './claims.handler.js'

export const claimsRoutes = Router()

claimsRoutes.post(
  API_ROUTES.claims.create,
  requireAuth,
  requirePermission('claims:create'),
  validate({ body: createClaimSchema }),
  createClaimHandler,
)

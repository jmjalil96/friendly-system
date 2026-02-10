import type { RequestHandler } from 'express'
import type { CreateClaimInput } from '@friendly-system/shared'
import { createClaim } from './claims.service.js'

export const createClaimHandler: RequestHandler = async (req, res) => {
  const ctx = {
    ipAddress: req.ip ?? 'unknown',
    userAgent: req.get('user-agent') ?? 'unknown',
  }

  const result = await createClaim(
    req.user!.userId,
    req.user!.orgId,
    req.body as CreateClaimInput,
    ctx,
    req.permissionScope!,
  )

  res.status(201).json(result)
}

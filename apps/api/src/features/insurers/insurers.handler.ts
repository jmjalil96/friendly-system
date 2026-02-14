import type { RequestHandler } from 'express'
import type {
  CreateInsurerInput,
  InsurerTimelineQuery,
  ListInsurersQuery,
  UpdateInsurerInput,
} from '@friendly-system/shared'
import {
  getInsurerById,
  getInsurerTimeline,
  listInsurers,
} from './insurers.read.service.js'
import {
  createInsurer,
  deactivateInsurer,
  updateInsurer,
} from './insurers.write.service.js'

const MAX_AUDIT_USER_AGENT_LENGTH = 512

function buildRequestContext(req: {
  ip?: string
  get(name: string): string | undefined
}) {
  return {
    ipAddress: req.ip ?? 'unknown',
    userAgent: (req.get('user-agent') ?? 'unknown').slice(
      0,
      MAX_AUDIT_USER_AGENT_LENGTH,
    ),
  }
}

export const createInsurerHandler: RequestHandler = async (req, res) => {
  const ctx = buildRequestContext(req)

  const result = await createInsurer(
    req.user!.userId,
    req.user!.orgId,
    req.body as CreateInsurerInput,
    ctx,
    req.permissionScope!,
  )

  res.status(201).json(result)
}

export const listInsurersHandler: RequestHandler = async (req, res) => {
  const result = await listInsurers(
    req.user!.userId,
    req.user!.orgId,
    req.query as unknown as ListInsurersQuery,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

export const getInsurerByIdHandler: RequestHandler = async (req, res) => {
  const result = await getInsurerById(
    req.user!.userId,
    req.user!.orgId,
    (req.params as { id: string }).id,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

export const updateInsurerHandler: RequestHandler = async (req, res) => {
  const ctx = buildRequestContext(req)

  const result = await updateInsurer(
    req.user!.userId,
    req.user!.orgId,
    (req.params as { id: string }).id,
    req.body as UpdateInsurerInput,
    ctx,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

export const deleteInsurerHandler: RequestHandler = async (req, res) => {
  const ctx = buildRequestContext(req)

  const result = await deactivateInsurer(
    req.user!.userId,
    req.user!.orgId,
    (req.params as { id: string }).id,
    ctx,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

export const getInsurerTimelineHandler: RequestHandler = async (req, res) => {
  const result = await getInsurerTimeline(
    req.user!.userId,
    req.user!.orgId,
    (req.params as { id: string }).id,
    req.query as unknown as InsurerTimelineQuery,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

import type { RequestHandler } from 'express'
import type {
  CreatePolicyInput,
  ListPoliciesQuery,
  LookupPolicyClientsQuery,
  LookupPolicyInsurersQuery,
  PolicyHistoryQuery,
  PolicyTimelineQuery,
  TransitionPolicyInput,
  UpdatePolicyInput,
} from '@friendly-system/shared'
import {
  getPolicyById,
  getPolicyHistory,
  getPolicyTimeline,
  listPolicies,
  lookupPolicyClients,
  lookupPolicyInsurers,
} from './policies.read.service.js'
import {
  createPolicy,
  deletePolicy,
  transitionPolicy,
  updatePolicy,
} from './policies.write.service.js'

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

export const createPolicyHandler: RequestHandler = async (req, res) => {
  const ctx = buildRequestContext(req)

  const result = await createPolicy(
    req.user!.userId,
    req.user!.orgId,
    req.body as CreatePolicyInput,
    ctx,
    req.permissionScope!,
  )

  res.status(201).json(result)
}

export const listPoliciesHandler: RequestHandler = async (req, res) => {
  const result = await listPolicies(
    req.user!.userId,
    req.user!.orgId,
    req.query as unknown as ListPoliciesQuery,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

export const lookupPolicyClientsHandler: RequestHandler = async (req, res) => {
  const result = await lookupPolicyClients(
    req.user!.userId,
    req.user!.orgId,
    req.query as unknown as LookupPolicyClientsQuery,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

export const lookupPolicyInsurersHandler: RequestHandler = async (req, res) => {
  const result = await lookupPolicyInsurers(
    req.user!.userId,
    req.user!.orgId,
    req.query as unknown as LookupPolicyInsurersQuery,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

export const getPolicyByIdHandler: RequestHandler = async (req, res) => {
  const result = await getPolicyById(
    req.user!.userId,
    req.user!.orgId,
    (req.params as { id: string }).id,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

export const getPolicyHistoryHandler: RequestHandler = async (req, res) => {
  const result = await getPolicyHistory(
    req.user!.userId,
    req.user!.orgId,
    (req.params as { id: string }).id,
    req.query as unknown as PolicyHistoryQuery,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

export const getPolicyTimelineHandler: RequestHandler = async (req, res) => {
  const result = await getPolicyTimeline(
    req.user!.userId,
    req.user!.orgId,
    (req.params as { id: string }).id,
    req.query as unknown as PolicyTimelineQuery,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

export const updatePolicyHandler: RequestHandler = async (req, res) => {
  const ctx = buildRequestContext(req)

  const result = await updatePolicy(
    req.user!.userId,
    req.user!.orgId,
    (req.params as { id: string }).id,
    req.body as UpdatePolicyInput,
    ctx,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

export const transitionPolicyHandler: RequestHandler = async (req, res) => {
  const ctx = buildRequestContext(req)

  const result = await transitionPolicy(
    req.user!.userId,
    req.user!.orgId,
    (req.params as { id: string }).id,
    req.body as TransitionPolicyInput,
    ctx,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

export const deletePolicyHandler: RequestHandler = async (req, res) => {
  const ctx = buildRequestContext(req)

  const result = await deletePolicy(
    req.user!.userId,
    req.user!.orgId,
    (req.params as { id: string }).id,
    ctx,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

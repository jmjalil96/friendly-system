import type { RequestHandler } from 'express'
import type {
  ClaimHistoryQuery,
  ClaimInvoicesQuery,
  ClaimTimelineQuery,
  CreateClaimInvoiceInput,
  CreateClaimInput,
  LookupClientAffiliatesQuery,
  LookupClientPoliciesQuery,
  LookupClientsQuery,
  ListClaimsQuery,
  TransitionClaimInput,
  UpdateClaimInvoiceInput,
  UpdateClaimInput,
} from '@friendly-system/shared'
import {
  getClaimHistory,
  getClaimInvoice,
  getClaimTimeline,
  getClaimById,
  listClaimInvoices,
  listClaims,
  lookupAffiliatePatients,
  lookupClientAffiliates,
  lookupClientPolicies,
  lookupClients,
} from './claims.read.service.js'
import {
  createClaimInvoice,
  createClaim,
  deleteClaim,
  deleteClaimInvoice,
  transitionClaim,
  updateClaimInvoice,
  updateClaim,
} from './claims.write.service.js'

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

export const createClaimHandler: RequestHandler = async (req, res) => {
  const ctx = buildRequestContext(req)

  const result = await createClaim(
    req.user!.userId,
    req.user!.orgId,
    req.body as CreateClaimInput,
    ctx,
    req.permissionScope!,
  )

  res.status(201).json(result)
}

export const listClaimsHandler: RequestHandler = async (req, res) => {
  const result = await listClaims(
    req.user!.userId,
    req.user!.orgId,
    req.query as unknown as ListClaimsQuery,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

export const lookupClientsHandler: RequestHandler = async (req, res) => {
  const result = await lookupClients(
    req.user!.userId,
    req.user!.orgId,
    req.query as unknown as LookupClientsQuery,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

export const lookupClientAffiliatesHandler: RequestHandler = async (
  req,
  res,
) => {
  const result = await lookupClientAffiliates(
    req.user!.userId,
    req.user!.orgId,
    (req.params as { clientId: string }).clientId,
    req.query as unknown as LookupClientAffiliatesQuery,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

export const lookupAffiliatePatientsHandler: RequestHandler = async (
  req,
  res,
) => {
  const result = await lookupAffiliatePatients(
    req.user!.userId,
    req.user!.orgId,
    (req.params as { affiliateId: string }).affiliateId,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

export const lookupClientPoliciesHandler: RequestHandler = async (req, res) => {
  const result = await lookupClientPolicies(
    req.user!.userId,
    req.user!.orgId,
    (req.params as { clientId: string }).clientId,
    req.query as unknown as LookupClientPoliciesQuery,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

export const getClaimByIdHandler: RequestHandler = async (req, res) => {
  const result = await getClaimById(
    req.user!.userId,
    req.user!.orgId,
    (req.params as { id: string }).id,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

export const getClaimHistoryHandler: RequestHandler = async (req, res) => {
  const result = await getClaimHistory(
    req.user!.userId,
    req.user!.orgId,
    (req.params as { id: string }).id,
    req.query as unknown as ClaimHistoryQuery,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

export const getClaimTimelineHandler: RequestHandler = async (req, res) => {
  const result = await getClaimTimeline(
    req.user!.userId,
    req.user!.orgId,
    (req.params as { id: string }).id,
    req.query as unknown as ClaimTimelineQuery,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

export const listClaimInvoicesHandler: RequestHandler = async (req, res) => {
  const result = await listClaimInvoices(
    req.user!.userId,
    req.user!.orgId,
    (req.params as { id: string }).id,
    req.query as unknown as ClaimInvoicesQuery,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

export const getClaimInvoiceHandler: RequestHandler = async (req, res) => {
  const result = await getClaimInvoice(
    req.user!.userId,
    req.user!.orgId,
    (req.params as { id: string; invoiceId: string }).id,
    (req.params as { id: string; invoiceId: string }).invoiceId,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

export const updateClaimHandler: RequestHandler = async (req, res) => {
  const ctx = buildRequestContext(req)

  const result = await updateClaim(
    req.user!.userId,
    req.user!.orgId,
    (req.params as { id: string }).id,
    req.body as UpdateClaimInput,
    ctx,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

export const transitionClaimHandler: RequestHandler = async (req, res) => {
  const ctx = buildRequestContext(req)

  const result = await transitionClaim(
    req.user!.userId,
    req.user!.orgId,
    (req.params as { id: string }).id,
    req.body as TransitionClaimInput,
    ctx,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

export const deleteClaimHandler: RequestHandler = async (req, res) => {
  const ctx = buildRequestContext(req)

  const result = await deleteClaim(
    req.user!.userId,
    req.user!.orgId,
    (req.params as { id: string }).id,
    ctx,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

export const createClaimInvoiceHandler: RequestHandler = async (req, res) => {
  const ctx = buildRequestContext(req)

  const result = await createClaimInvoice(
    req.user!.userId,
    req.user!.orgId,
    (req.params as { id: string }).id,
    req.body as CreateClaimInvoiceInput,
    ctx,
    req.permissionScope!,
  )

  res.status(201).json(result)
}

export const updateClaimInvoiceHandler: RequestHandler = async (req, res) => {
  const ctx = buildRequestContext(req)

  const result = await updateClaimInvoice(
    req.user!.userId,
    req.user!.orgId,
    (req.params as { id: string; invoiceId: string }).id,
    (req.params as { id: string; invoiceId: string }).invoiceId,
    req.body as UpdateClaimInvoiceInput,
    ctx,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

export const deleteClaimInvoiceHandler: RequestHandler = async (req, res) => {
  const ctx = buildRequestContext(req)

  const result = await deleteClaimInvoice(
    req.user!.userId,
    req.user!.orgId,
    (req.params as { id: string; invoiceId: string }).id,
    (req.params as { id: string; invoiceId: string }).invoiceId,
    ctx,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

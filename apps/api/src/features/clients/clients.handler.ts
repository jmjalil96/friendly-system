import type { RequestHandler } from 'express'
import type {
  ClientPoliciesQuery,
  ClientTimelineQuery,
  CreateClientInput,
  ListClientsQuery,
  UpdateClientInput,
} from '@friendly-system/shared'
import {
  getClientById,
  getClientTimeline,
  listClientPolicies,
  listClients,
} from './clients.read.service.js'
import {
  createClient,
  deactivateClient,
  updateClient,
} from './clients.write.service.js'

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

export const createClientHandler: RequestHandler = async (req, res) => {
  const ctx = buildRequestContext(req)

  const result = await createClient(
    req.user!.userId,
    req.user!.orgId,
    req.body as CreateClientInput,
    ctx,
    req.permissionScope!,
  )

  res.status(201).json(result)
}

export const listClientsHandler: RequestHandler = async (req, res) => {
  const result = await listClients(
    req.user!.userId,
    req.user!.orgId,
    req.query as unknown as ListClientsQuery,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

export const getClientByIdHandler: RequestHandler = async (req, res) => {
  const result = await getClientById(
    req.user!.userId,
    req.user!.orgId,
    (req.params as { id: string }).id,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

export const updateClientHandler: RequestHandler = async (req, res) => {
  const ctx = buildRequestContext(req)

  const result = await updateClient(
    req.user!.userId,
    req.user!.orgId,
    (req.params as { id: string }).id,
    req.body as UpdateClientInput,
    ctx,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

export const deleteClientHandler: RequestHandler = async (req, res) => {
  const ctx = buildRequestContext(req)

  const result = await deactivateClient(
    req.user!.userId,
    req.user!.orgId,
    (req.params as { id: string }).id,
    ctx,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

export const getClientTimelineHandler: RequestHandler = async (req, res) => {
  const result = await getClientTimeline(
    req.user!.userId,
    req.user!.orgId,
    (req.params as { id: string }).id,
    req.query as unknown as ClientTimelineQuery,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

export const listClientPoliciesHandler: RequestHandler = async (req, res) => {
  const result = await listClientPolicies(
    req.user!.userId,
    req.user!.orgId,
    (req.params as { id: string }).id,
    req.query as unknown as ClientPoliciesQuery,
    req.permissionScope!,
  )

  res.status(200).json(result)
}

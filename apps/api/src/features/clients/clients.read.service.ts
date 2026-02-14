import {
  ERROR_CODES,
  type ClientPoliciesQuery,
  type ClientPoliciesResponse,
  type ClientTimelineQuery,
  type ClientTimelineResponse,
  type GetClientByIdResponse,
  type ListClientsQuery,
  type ListClientsResponse,
} from '@friendly-system/shared'
import type { Prisma } from '@prisma/client'
import { prisma } from '../../shared/db/prisma.js'
import { AppError } from '../../shared/middleware/error-handler.js'
import { logger } from '../../shared/logger.js'
import {
  assertClientAccess,
  getClientByIdResponseRecord,
  toClientByIdResponse,
  toDateOnly,
} from './clients.shared.service.js'

const CLIENT_TIMELINE_ACTIONS = [
  'client.created',
  'client.updated',
  'client.deactivated',
] as const

export async function listClients(
  userId: string,
  orgId: string,
  query: ListClientsQuery,
  scope: string,
): Promise<ListClientsResponse> {
  const { search, isActive, sortBy, sortOrder, page, limit } = query

  const where: Prisma.ClientWhereInput = {
    orgId,
  }

  if (scope === 'client') {
    const userClients = await prisma.userClient.findMany({
      where: { userId },
      select: { clientId: true },
    })

    where.id = { in: userClients.map((uc) => uc.clientId) }
  }

  if (scope === 'own') {
    const affiliates = await prisma.affiliate.findMany({
      where: {
        orgId,
        userId,
        isActive: true,
      },
      select: { clientId: true },
    })

    const clientIds = [
      ...new Set(affiliates.map((affiliate) => affiliate.clientId)),
    ]
    where.id = { in: clientIds }
  }

  if (search) {
    where.name = {
      contains: search,
      mode: 'insensitive',
    }
  }

  if (isActive !== undefined) {
    where.isActive = isActive
  }

  const [totalCount, clients] = await Promise.all([
    prisma.client.count({ where }),
    prisma.client.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        orgId: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ])

  return {
    data: clients.map((client) => ({
      id: client.id,
      orgId: client.orgId,
      name: client.name,
      isActive: client.isActive,
      createdAt: client.createdAt.toISOString(),
      updatedAt: client.updatedAt.toISOString(),
    })),
    meta: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  }
}

export async function getClientById(
  userId: string,
  orgId: string,
  clientId: string,
  scope: string,
): Promise<GetClientByIdResponse> {
  await assertClientAccess(userId, orgId, clientId, scope)

  const client = await getClientByIdResponseRecord(clientId)

  if (!client) {
    logger.warn(
      { clientId, userId, scope },
      'Client lookup lost client after access check',
    )
    throw new AppError(
      404,
      'Client not found',
      ERROR_CODES.CLIENTS_CLIENT_NOT_FOUND,
    )
  }

  return toClientByIdResponse(client)
}

export async function getClientTimeline(
  userId: string,
  orgId: string,
  clientId: string,
  query: ClientTimelineQuery,
  scope: string,
): Promise<ClientTimelineResponse> {
  await assertClientAccess(userId, orgId, clientId, scope)

  const { page, limit } = query

  const where: Prisma.AuditLogWhereInput = {
    orgId,
    resource: 'client',
    resourceId: clientId,
    action: { in: [...CLIENT_TIMELINE_ACTIONS] },
  }

  const [totalCount, timeline] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        action: true,
        resource: true,
        resourceId: true,
        userId: true,
        user: {
          select: {
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        ipAddress: true,
        userAgent: true,
        metadata: true,
        createdAt: true,
      },
    }),
  ])

  return {
    data: timeline.map((entry) => ({
      id: entry.id,
      action: entry.action as ClientTimelineResponse['data'][number]['action'],
      resource: entry.resource,
      resourceId: entry.resourceId,
      userId: entry.userId,
      userFirstName: entry.user?.profile?.firstName ?? null,
      userLastName: entry.user?.profile?.lastName ?? null,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      metadata: entry.metadata,
      createdAt: entry.createdAt.toISOString(),
    })),
    meta: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  }
}

export async function listClientPolicies(
  userId: string,
  orgId: string,
  clientId: string,
  query: ClientPoliciesQuery,
  scope: string,
): Promise<ClientPoliciesResponse> {
  await assertClientAccess(userId, orgId, clientId, scope)

  const { search, page, limit } = query

  const where: Prisma.PolicyWhereInput = {
    orgId,
    clientId,
  }

  if (search) {
    where.policyNumber = {
      contains: search,
      mode: 'insensitive',
    }
  }

  const [totalCount, policies] = await Promise.all([
    prisma.policy.count({ where }),
    prisma.policy.findMany({
      where,
      orderBy: { startDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        policyNumber: true,
        type: true,
        status: true,
        planName: true,
        employeeClass: true,
        maxCoverage: true,
        deductible: true,
        startDate: true,
        endDate: true,
        insurer: {
          select: {
            name: true,
          },
        },
      },
    }),
  ])

  return {
    data: policies.map((policy) => ({
      id: policy.id,
      policyNumber: policy.policyNumber,
      type: policy.type,
      status: policy.status,
      planName: policy.planName,
      employeeClass: policy.employeeClass,
      maxCoverage: policy.maxCoverage?.toString() ?? null,
      deductible: policy.deductible?.toString() ?? null,
      startDate: toDateOnly(policy.startDate),
      endDate: toDateOnly(policy.endDate),
      insurerName: policy.insurer.name,
    })),
    meta: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  }
}

import type {
  GetPolicyByIdResponse,
  ListPoliciesQuery,
  ListPoliciesResponse,
  LookupPolicyClientsQuery,
  LookupPolicyClientsResponse,
  LookupPolicyInsurersQuery,
  LookupPolicyInsurersResponse,
  PolicyHistoryQuery,
  PolicyHistoryResponse,
  PolicyTimelineQuery,
  PolicyTimelineResponse,
} from '@friendly-system/shared'
import { ERROR_CODES } from '@friendly-system/shared'
import type { Prisma } from '@prisma/client'
import type { PolicyStatus as PrismaPolicyStatus } from '@prisma/client'
import { prisma } from '../../shared/db/prisma.js'
import { AppError } from '../../shared/middleware/error-handler.js'
import { logger } from '../../shared/logger.js'
import {
  assertPolicyAccess,
  getPolicyByIdResponseRecord,
  toDateOnly,
  toPolicyByIdResponse,
} from './policies.shared.service.js'

type LookupClientRecord = {
  id: string
  orgId: string
  isActive: boolean
}

async function assertLookupClientAccess(
  userId: string,
  orgId: string,
  clientId: string,
  scope: string,
): Promise<LookupClientRecord> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, orgId: true, isActive: true },
  })

  if (!client || client.orgId !== orgId) {
    logger.warn(
      { clientId, userId, scope },
      'Policy lookup attempted with unknown client',
    )
    throw new AppError(
      404,
      'Client not found',
      ERROR_CODES.POLICIES_CLIENT_NOT_FOUND,
    )
  }

  if (!client.isActive) {
    logger.warn(
      { clientId, userId, scope },
      'Policy lookup attempted with inactive client',
    )
    throw new AppError(
      422,
      'Client is inactive',
      ERROR_CODES.POLICIES_CLIENT_INACTIVE,
    )
  }

  if (scope === 'client') {
    const userClient = await prisma.userClient.findUnique({
      where: { userId_clientId: { userId, clientId } },
    })

    if (!userClient) {
      logger.warn(
        { clientId, userId, scope },
        'Policy lookup denied by client scope',
      )
      throw new AppError(
        403,
        'Insufficient permissions',
        ERROR_CODES.PERMISSION_DENIED,
      )
    }
  }

  if (scope === 'own') {
    const linkedAffiliate = await prisma.affiliate.findFirst({
      where: {
        orgId,
        clientId,
        userId,
        isActive: true,
      },
      select: { id: true },
    })

    if (!linkedAffiliate) {
      logger.warn(
        { clientId, userId, scope },
        'Policy lookup denied by own scope',
      )
      throw new AppError(
        403,
        'Insufficient permissions',
        ERROR_CODES.PERMISSION_DENIED,
      )
    }
  }

  return client
}

export async function getPolicyById(
  userId: string,
  orgId: string,
  policyId: string,
  scope: string,
): Promise<GetPolicyByIdResponse> {
  await assertPolicyAccess(userId, orgId, policyId, scope)

  const policy = await getPolicyByIdResponseRecord(policyId)

  if (!policy) {
    logger.warn(
      { policyId, userId, scope },
      'Policy lookup lost policy after access check',
    )
    throw new AppError(
      404,
      'Policy not found',
      ERROR_CODES.POLICIES_POLICY_NOT_FOUND,
    )
  }

  return toPolicyByIdResponse(policy)
}

export async function listPolicies(
  userId: string,
  orgId: string,
  query: ListPoliciesQuery,
  scope: string,
): Promise<ListPoliciesResponse> {
  const { status, search, sortBy, sortOrder, page, limit } = query

  const where: Prisma.PolicyWhereInput = { orgId }

  if (scope === 'client') {
    const userClients = await prisma.userClient.findMany({
      where: { userId },
      select: { clientId: true },
    })
    where.clientId = { in: userClients.map((uc) => uc.clientId) }
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
    const clientIds = [...new Set(affiliates.map((a) => a.clientId))]
    where.clientId = { in: clientIds }
  }

  if (status && status.length > 0) {
    where.status = { in: status as PrismaPolicyStatus[] }
  }

  if (search) {
    where.OR = [
      {
        policyNumber: {
          contains: search,
          mode: 'insensitive',
        },
      },
      {
        client: {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
      },
      {
        insurer: {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
      },
      {
        planName: {
          contains: search,
          mode: 'insensitive',
        },
      },
      {
        employeeClass: {
          contains: search,
          mode: 'insensitive',
        },
      },
    ]
  }

  const [totalCount, policies] = await Promise.all([
    prisma.policy.count({ where }),
    prisma.policy.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        policyNumber: true,
        status: true,
        clientId: true,
        client: { select: { name: true } },
        insurerId: true,
        insurer: { select: { name: true } },
        type: true,
        planName: true,
        employeeClass: true,
        maxCoverage: true,
        deductible: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ])

  return {
    data: policies.map((policy) => ({
      id: policy.id,
      policyNumber: policy.policyNumber,
      status: policy.status,
      clientId: policy.clientId,
      clientName: policy.client.name,
      insurerId: policy.insurerId,
      insurerName: policy.insurer.name,
      type: policy.type,
      planName: policy.planName,
      employeeClass: policy.employeeClass,
      maxCoverage: policy.maxCoverage?.toString() ?? null,
      deductible: policy.deductible?.toString() ?? null,
      startDate: toDateOnly(policy.startDate)!,
      endDate: toDateOnly(policy.endDate)!,
      createdAt: policy.createdAt.toISOString(),
      updatedAt: policy.updatedAt.toISOString(),
    })),
    meta: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  }
}

export async function lookupPolicyClients(
  userId: string,
  orgId: string,
  query: LookupPolicyClientsQuery,
  scope: string,
): Promise<LookupPolicyClientsResponse> {
  const { search, page, limit } = query

  const where: Prisma.ClientWhereInput = {
    orgId,
    isActive: true,
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
    const clientIds = [...new Set(affiliates.map((a) => a.clientId))]
    where.id = { in: clientIds }
  }

  if (search) {
    where.name = {
      contains: search,
      mode: 'insensitive',
    }
  }

  const [totalCount, clients] = await Promise.all([
    prisma.client.count({ where }),
    prisma.client.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
      },
    }),
  ])

  return {
    data: clients,
    meta: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  }
}

export async function lookupPolicyInsurers(
  _userId: string,
  orgId: string,
  query: LookupPolicyInsurersQuery,
  _scope: string,
): Promise<LookupPolicyInsurersResponse> {
  const { search, page, limit } = query

  const where: Prisma.InsurerWhereInput = {
    orgId,
    isActive: true,
  }

  if (search) {
    where.OR = [
      {
        name: {
          contains: search,
          mode: 'insensitive',
        },
      },
      {
        code: {
          contains: search,
          mode: 'insensitive',
        },
      },
    ]
  }

  const [totalCount, insurers] = await Promise.all([
    prisma.insurer.count({ where }),
    prisma.insurer.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
      },
    }),
  ])

  return {
    data: insurers,
    meta: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  }
}

export async function getPolicyHistory(
  userId: string,
  orgId: string,
  policyId: string,
  query: PolicyHistoryQuery,
  scope: string,
): Promise<PolicyHistoryResponse> {
  await assertPolicyAccess(userId, orgId, policyId, scope)

  const { page, limit } = query

  const [totalCount, history] = await Promise.all([
    prisma.policyHistory.count({ where: { policyId } }),
    prisma.policyHistory.findMany({
      where: { policyId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        policyId: true,
        fromStatus: true,
        toStatus: true,
        reason: true,
        notes: true,
        createdById: true,
        createdBy: {
          select: {
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        createdAt: true,
      },
    }),
  ])

  return {
    data: history.map((entry) => ({
      id: entry.id,
      policyId: entry.policyId,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      reason: entry.reason,
      notes: entry.notes,
      createdById: entry.createdById,
      createdByFirstName: entry.createdBy.profile?.firstName ?? null,
      createdByLastName: entry.createdBy.profile?.lastName ?? null,
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

const POLICY_TIMELINE_ACTIONS = [
  'policy.created',
  'policy.updated',
  'policy.transitioned',
  'policy.deleted',
] as const

export async function getPolicyTimeline(
  userId: string,
  orgId: string,
  policyId: string,
  query: PolicyTimelineQuery,
  scope: string,
): Promise<PolicyTimelineResponse> {
  await assertPolicyAccess(userId, orgId, policyId, scope)

  const { page, limit } = query

  const where: Prisma.AuditLogWhereInput = {
    orgId,
    resource: 'policy',
    resourceId: policyId,
    action: { in: [...POLICY_TIMELINE_ACTIONS] },
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
      action: entry.action as PolicyTimelineResponse['data'][number]['action'],
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

export async function assertPolicyClientScopeForCreateOrUpdate(
  userId: string,
  orgId: string,
  clientId: string,
  scope: string,
) {
  await assertLookupClientAccess(userId, orgId, clientId, scope)
}

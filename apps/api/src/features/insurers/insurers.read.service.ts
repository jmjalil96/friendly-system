import {
  ERROR_CODES,
  type GetInsurerByIdResponse,
  type InsurerTimelineQuery,
  type InsurerTimelineResponse,
  type ListInsurersQuery,
  type ListInsurersResponse,
} from '@friendly-system/shared'
import type { Prisma } from '@prisma/client'
import { prisma } from '../../shared/db/prisma.js'
import { AppError } from '../../shared/middleware/error-handler.js'
import { logger } from '../../shared/logger.js'
import {
  assertInsurerAccess,
  assertInsurerOwnerScope,
  getInsurerByIdResponseRecord,
  toInsurerByIdResponse,
} from './insurers.shared.service.js'

const INSURER_TIMELINE_ACTIONS = [
  'insurer.created',
  'insurer.updated',
  'insurer.deactivated',
] as const

export async function listInsurers(
  userId: string,
  orgId: string,
  query: ListInsurersQuery,
  scope: string,
): Promise<ListInsurersResponse> {
  assertInsurerOwnerScope(userId, scope, 'read')

  const { search, isActive, type, sortBy, sortOrder, page, limit } = query

  const where: Prisma.InsurerWhereInput = {
    orgId,
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

  if (isActive !== undefined) {
    where.isActive = isActive
  }

  if (type !== undefined) {
    where.type = type
  }

  const [totalCount, insurers] = await Promise.all([
    prisma.insurer.count({ where }),
    prisma.insurer.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        orgId: true,
        name: true,
        type: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ])

  return {
    data: insurers.map((insurer) => ({
      id: insurer.id,
      orgId: insurer.orgId,
      name: insurer.name,
      type: insurer.type,
      isActive: insurer.isActive,
      createdAt: insurer.createdAt.toISOString(),
      updatedAt: insurer.updatedAt.toISOString(),
    })),
    meta: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  }
}

export async function getInsurerById(
  userId: string,
  orgId: string,
  insurerId: string,
  scope: string,
): Promise<GetInsurerByIdResponse> {
  assertInsurerOwnerScope(userId, scope, 'read')
  await assertInsurerAccess(userId, orgId, insurerId)

  const insurer = await getInsurerByIdResponseRecord(insurerId)

  if (!insurer) {
    logger.warn(
      { insurerId, userId, scope },
      'Insurer lookup lost insurer after access check',
    )
    throw new AppError(
      404,
      'Insurer not found',
      ERROR_CODES.INSURERS_INSURER_NOT_FOUND,
    )
  }

  return toInsurerByIdResponse(insurer)
}

export async function getInsurerTimeline(
  userId: string,
  orgId: string,
  insurerId: string,
  query: InsurerTimelineQuery,
  scope: string,
): Promise<InsurerTimelineResponse> {
  assertInsurerOwnerScope(userId, scope, 'read')
  await assertInsurerAccess(userId, orgId, insurerId)

  const { page, limit } = query

  const where: Prisma.AuditLogWhereInput = {
    orgId,
    resource: 'insurer',
    resourceId: insurerId,
    action: { in: [...INSURER_TIMELINE_ACTIONS] },
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
      action: entry.action as InsurerTimelineResponse['data'][number]['action'],
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

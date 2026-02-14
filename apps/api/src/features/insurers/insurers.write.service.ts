import type {
  CreateInsurerInput,
  CreateInsurerResponse,
  DeleteInsurerResponse,
  GetInsurerByIdResponse,
  UpdateInsurerInput,
} from '@friendly-system/shared'
import { ERROR_CODES } from '@friendly-system/shared'
import { Prisma } from '@prisma/client'
import { getUniqueViolationFields } from '../../shared/db/prisma-errors.js'
import { prisma } from '../../shared/db/prisma.js'
import { AppError } from '../../shared/middleware/error-handler.js'
import { logger } from '../../shared/logger.js'
import type { RequestContext } from '../../shared/types.js'
import {
  INSURER_BY_ID_RESPONSE_SELECT,
  assertInsurerAccess,
  assertInsurerOwnerScope,
  toInsurerByIdResponse,
} from './insurers.shared.service.js'

function mapInsurerUniqueConflict(
  error: Prisma.PrismaClientKnownRequestError,
): AppError | null {
  const fields = getUniqueViolationFields(error)
  const hasNameField = fields.includes('name')
  const hasCodeField = fields.includes('code')

  if (hasNameField) {
    return new AppError(
      409,
      'Insurer name unavailable',
      ERROR_CODES.INSURERS_NAME_UNAVAILABLE,
    )
  }

  if (hasCodeField) {
    return new AppError(
      409,
      'Insurer code unavailable',
      ERROR_CODES.INSURERS_CODE_UNAVAILABLE,
    )
  }

  return null
}

function toCreateData(orgId: string, input: CreateInsurerInput) {
  return {
    orgId,
    name: input.name,
    type: input.type,
    code: input.code ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    website: input.website ?? null,
    isActive: input.isActive ?? true,
  }
}

function toUpdateData(input: UpdateInsurerInput) {
  return {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.code !== undefined ? { code: input.code } : {}),
    ...(input.email !== undefined ? { email: input.email } : {}),
    ...(input.phone !== undefined ? { phone: input.phone } : {}),
    ...(input.website !== undefined ? { website: input.website } : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
  }
}

export async function createInsurer(
  userId: string,
  orgId: string,
  input: CreateInsurerInput,
  ctx: RequestContext,
  scope: string,
): Promise<CreateInsurerResponse> {
  assertInsurerOwnerScope(userId, scope, 'create')

  try {
    const created = await prisma.$transaction(async (tx) => {
      const insurer = await tx.insurer.create({
        data: toCreateData(orgId, input),
        select: INSURER_BY_ID_RESPONSE_SELECT,
      })

      await tx.auditLog.create({
        data: {
          userId,
          orgId,
          action: 'insurer.created',
          resource: 'insurer',
          resourceId: insurer.id,
          metadata: {
            name: insurer.name,
            type: insurer.type,
            code: insurer.code,
            email: insurer.email,
            phone: insurer.phone,
            website: insurer.website,
            isActive: insurer.isActive,
          },
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        },
      })

      return insurer
    })

    logger.info({ insurerId: created.id, userId }, 'Insurer created')

    return toInsurerByIdResponse(created)
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const mapped = mapInsurerUniqueConflict(error)
      if (mapped) throw mapped
    }

    throw error
  }
}

export async function updateInsurer(
  userId: string,
  orgId: string,
  insurerId: string,
  input: UpdateInsurerInput,
  ctx: RequestContext,
  scope: string,
): Promise<GetInsurerByIdResponse> {
  assertInsurerOwnerScope(userId, scope, 'update')
  await assertInsurerAccess(userId, orgId, insurerId)

  const changedFields = Object.keys(input)

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const insurer = await tx.insurer.update({
        where: { id: insurerId },
        data: toUpdateData(input),
        select: INSURER_BY_ID_RESPONSE_SELECT,
      })

      await tx.auditLog.create({
        data: {
          userId,
          orgId,
          action: 'insurer.updated',
          resource: 'insurer',
          resourceId: insurerId,
          metadata: {
            changedFields,
          },
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        },
      })

      return insurer
    })

    logger.info({ insurerId, userId, changedFields }, 'Insurer updated')

    return toInsurerByIdResponse(updated)
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const mapped = mapInsurerUniqueConflict(error)
      if (mapped) throw mapped
    }

    throw error
  }
}

export async function deactivateInsurer(
  userId: string,
  orgId: string,
  insurerId: string,
  ctx: RequestContext,
  scope: string,
): Promise<DeleteInsurerResponse> {
  assertInsurerOwnerScope(userId, scope, 'deactivate')

  const current = await assertInsurerAccess(userId, orgId, insurerId)

  await prisma.$transaction(async (tx) => {
    await tx.insurer.update({
      where: { id: insurerId },
      data: { isActive: false },
    })

    await tx.auditLog.create({
      data: {
        userId,
        orgId,
        action: 'insurer.deactivated',
        resource: 'insurer',
        resourceId: insurerId,
        metadata: {
          wasActive: current.isActive,
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    })
  })

  logger.info({ insurerId, userId }, 'Insurer deactivated')

  return { message: 'Insurer deactivated' }
}

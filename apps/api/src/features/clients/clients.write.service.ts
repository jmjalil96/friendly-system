import type {
  CreateClientInput,
  CreateClientResponse,
  DeleteClientResponse,
  GetClientByIdResponse,
  UpdateClientInput,
} from '@friendly-system/shared'
import { ERROR_CODES } from '@friendly-system/shared'
import { prisma } from '../../shared/db/prisma.js'
import { AppError } from '../../shared/middleware/error-handler.js'
import { logger } from '../../shared/logger.js'
import type { RequestContext } from '../../shared/types.js'
import {
  CLIENT_BY_ID_RESPONSE_SELECT,
  assertClientAccess,
  toClientByIdResponse,
} from './clients.shared.service.js'

export async function createClient(
  userId: string,
  orgId: string,
  input: CreateClientInput,
  ctx: RequestContext,
  scope: string,
): Promise<CreateClientResponse> {
  if (scope === 'own') {
    logger.warn({ userId, scope }, 'Client create denied by own scope')
    throw new AppError(
      403,
      'Insufficient permissions',
      ERROR_CODES.PERMISSION_DENIED,
    )
  }

  const created = await prisma.$transaction(async (tx) => {
    const client = await tx.client.create({
      data: {
        orgId,
        name: input.name,
        isActive: input.isActive ?? true,
      },
      select: CLIENT_BY_ID_RESPONSE_SELECT,
    })

    await tx.auditLog.create({
      data: {
        userId,
        orgId,
        action: 'client.created',
        resource: 'client',
        resourceId: client.id,
        metadata: {
          name: client.name,
          isActive: client.isActive,
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    })

    return client
  })

  logger.info({ clientId: created.id, userId }, 'Client created')

  return toClientByIdResponse(created)
}

export async function updateClient(
  userId: string,
  orgId: string,
  clientId: string,
  input: UpdateClientInput,
  ctx: RequestContext,
  scope: string,
): Promise<GetClientByIdResponse> {
  if (scope === 'own') {
    logger.warn(
      { clientId, userId, scope },
      'Client update denied by own scope',
    )
    throw new AppError(
      403,
      'Insufficient permissions',
      ERROR_CODES.PERMISSION_DENIED,
    )
  }

  await assertClientAccess(userId, orgId, clientId, scope)

  const changedFields = Object.keys(input)

  const updated = await prisma.$transaction(async (tx) => {
    const client = await tx.client.update({
      where: { id: clientId },
      data: input,
      select: CLIENT_BY_ID_RESPONSE_SELECT,
    })

    await tx.auditLog.create({
      data: {
        userId,
        orgId,
        action: 'client.updated',
        resource: 'client',
        resourceId: clientId,
        metadata: {
          changedFields,
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    })

    return client
  })

  logger.info({ clientId, userId, changedFields }, 'Client updated')

  return toClientByIdResponse(updated)
}

export async function deactivateClient(
  userId: string,
  orgId: string,
  clientId: string,
  ctx: RequestContext,
  scope: string,
): Promise<DeleteClientResponse> {
  if (scope === 'own') {
    logger.warn(
      { clientId, userId, scope },
      'Client deactivate denied by own scope',
    )
    throw new AppError(
      403,
      'Insufficient permissions',
      ERROR_CODES.PERMISSION_DENIED,
    )
  }

  const current = await assertClientAccess(userId, orgId, clientId, scope)

  await prisma.$transaction(async (tx) => {
    await tx.client.update({
      where: { id: clientId },
      data: { isActive: false },
    })

    await tx.auditLog.create({
      data: {
        userId,
        orgId,
        action: 'client.deactivated',
        resource: 'client',
        resourceId: clientId,
        metadata: {
          wasActive: current.isActive,
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    })
  })

  logger.info({ clientId, userId }, 'Client deactivated')

  return { message: 'Client deactivated' }
}

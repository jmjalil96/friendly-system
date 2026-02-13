import {
  ERROR_CODES,
  type GetClientByIdResponse,
} from '@friendly-system/shared'
import type { Client, Prisma } from '@prisma/client'
import { prisma } from '../../shared/db/prisma.js'
import { AppError } from '../../shared/middleware/error-handler.js'
import { logger } from '../../shared/logger.js'

export const CLIENT_BY_ID_RESPONSE_SELECT = {
  id: true,
  orgId: true,
  name: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.ClientSelect

export type ClientByIdResponseRecord = Prisma.ClientGetPayload<{
  select: typeof CLIENT_BY_ID_RESPONSE_SELECT
}>

export async function assertClientAccess(
  userId: string,
  orgId: string,
  clientId: string,
  scope: string,
): Promise<Client> {
  const client = await prisma.client.findUnique({ where: { id: clientId } })

  if (!client || client.orgId !== orgId) {
    logger.warn(
      { clientId, userId, scope },
      'Client access with unknown client',
    )
    throw new AppError(
      404,
      'Client not found',
      ERROR_CODES.CLIENTS_CLIENT_NOT_FOUND,
    )
  }

  if (scope === 'client') {
    const userClient = await prisma.userClient.findUnique({
      where: { userId_clientId: { userId, clientId } },
    })

    if (!userClient) {
      logger.warn(
        { clientId, userId, scope },
        'Client access denied by client scope',
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
        'Client access denied by own scope',
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

export async function getClientByIdResponseRecord(
  clientId: string,
): Promise<ClientByIdResponseRecord | null> {
  return prisma.client.findUnique({
    where: { id: clientId },
    select: CLIENT_BY_ID_RESPONSE_SELECT,
  })
}

export function toClientByIdResponse(
  client: ClientByIdResponseRecord,
): GetClientByIdResponse {
  return {
    id: client.id,
    orgId: client.orgId,
    name: client.name,
    isActive: client.isActive,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
  }
}

export function toDateOnly(d: Date): string {
  return d.toISOString().split('T')[0]!
}

import {
  ERROR_CODES,
  type GetInsurerByIdResponse,
} from '@friendly-system/shared'
import type { Insurer, Prisma } from '@prisma/client'
import { prisma } from '../../shared/db/prisma.js'
import { AppError } from '../../shared/middleware/error-handler.js'
import { logger } from '../../shared/logger.js'

export const INSURER_BY_ID_RESPONSE_SELECT = {
  id: true,
  orgId: true,
  name: true,
  type: true,
  code: true,
  email: true,
  phone: true,
  website: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.InsurerSelect

export type InsurerByIdResponseRecord = Prisma.InsurerGetPayload<{
  select: typeof INSURER_BY_ID_RESPONSE_SELECT
}>

export function assertInsurerOwnerScope(
  userId: string,
  scope: string,
  action: 'create' | 'read' | 'update' | 'deactivate',
): void {
  if (scope === 'all') return

  logger.warn({ userId, scope, action }, 'Insurer access denied by scope')
  throw new AppError(
    403,
    'Insufficient permissions',
    ERROR_CODES.PERMISSION_DENIED,
  )
}

export async function assertInsurerAccess(
  userId: string,
  orgId: string,
  insurerId: string,
): Promise<Insurer> {
  const insurer = await prisma.insurer.findUnique({ where: { id: insurerId } })

  if (!insurer || insurer.orgId !== orgId) {
    logger.warn({ insurerId, userId }, 'Insurer access with unknown insurer')
    throw new AppError(
      404,
      'Insurer not found',
      ERROR_CODES.INSURERS_INSURER_NOT_FOUND,
    )
  }

  return insurer
}

export async function getInsurerByIdResponseRecord(
  insurerId: string,
): Promise<InsurerByIdResponseRecord | null> {
  return prisma.insurer.findUnique({
    where: { id: insurerId },
    select: INSURER_BY_ID_RESPONSE_SELECT,
  })
}

export function toInsurerByIdResponse(
  insurer: InsurerByIdResponseRecord,
): GetInsurerByIdResponse {
  return {
    id: insurer.id,
    orgId: insurer.orgId,
    name: insurer.name,
    type: insurer.type,
    code: insurer.code,
    email: insurer.email,
    phone: insurer.phone,
    website: insurer.website,
    isActive: insurer.isActive,
    createdAt: insurer.createdAt.toISOString(),
    updatedAt: insurer.updatedAt.toISOString(),
  }
}

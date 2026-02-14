import {
  ERROR_CODES,
  type GetPolicyByIdResponse,
} from '@friendly-system/shared'
import type { Policy, Prisma } from '@prisma/client'
import { prisma } from '../../shared/db/prisma.js'
import { AppError } from '../../shared/middleware/error-handler.js'
import { logger } from '../../shared/logger.js'

export const POLICY_BY_ID_RESPONSE_SELECT = {
  id: true,
  policyNumber: true,
  status: true,
  clientId: true,
  client: {
    select: {
      name: true,
    },
  },
  insurerId: true,
  insurer: {
    select: {
      name: true,
    },
  },
  type: true,
  startDate: true,
  endDate: true,
  ambulatoryCoinsurancePct: true,
  hospitalaryCoinsurancePct: true,
  maternityCost: true,
  tPremium: true,
  tplus1Premium: true,
  tplusfPremium: true,
  benefitsCostPerPerson: true,
  maxCoverage: true,
  deductible: true,
  planName: true,
  employeeClass: true,
  cancellationReason: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.PolicySelect

export type PolicyByIdResponseRecord = Prisma.PolicyGetPayload<{
  select: typeof POLICY_BY_ID_RESPONSE_SELECT
}>

export async function assertPolicyAccess(
  userId: string,
  orgId: string,
  policyId: string,
  scope: string,
): Promise<Policy> {
  const policy = await prisma.policy.findUnique({ where: { id: policyId } })

  if (!policy || policy.orgId !== orgId) {
    logger.warn(
      { policyId, userId, scope },
      'Policy access with unknown policy',
    )
    throw new AppError(
      404,
      'Policy not found',
      ERROR_CODES.POLICIES_POLICY_NOT_FOUND,
    )
  }

  if (scope === 'client') {
    const userClient = await prisma.userClient.findUnique({
      where: { userId_clientId: { userId, clientId: policy.clientId } },
    })

    if (!userClient) {
      logger.warn(
        { policyId, userId, scope },
        'Policy access denied by client scope',
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
        clientId: policy.clientId,
        userId,
        isActive: true,
      },
      select: { id: true },
    })

    if (!linkedAffiliate) {
      logger.warn(
        { policyId, userId, scope },
        'Policy access denied by own scope',
      )
      throw new AppError(
        403,
        'Insufficient permissions',
        ERROR_CODES.PERMISSION_DENIED,
      )
    }
  }

  return policy
}

export function toDateOnly(d: Date | null): string | null {
  return d?.toISOString().split('T')[0] ?? null
}

export async function getPolicyByIdResponseRecord(
  policyId: string,
): Promise<PolicyByIdResponseRecord | null> {
  return prisma.policy.findUnique({
    where: { id: policyId },
    select: POLICY_BY_ID_RESPONSE_SELECT,
  })
}

export function toPolicyByIdResponse(
  policy: PolicyByIdResponseRecord,
): GetPolicyByIdResponse {
  return {
    id: policy.id,
    policyNumber: policy.policyNumber,
    status: policy.status,
    clientId: policy.clientId,
    clientName: policy.client.name,
    insurerId: policy.insurerId,
    insurerName: policy.insurer.name,
    type: policy.type,
    startDate: toDateOnly(policy.startDate)!,
    endDate: toDateOnly(policy.endDate)!,
    ambulatoryCoinsurancePct:
      policy.ambulatoryCoinsurancePct?.toString() ?? null,
    hospitalaryCoinsurancePct:
      policy.hospitalaryCoinsurancePct?.toString() ?? null,
    maternityCost: policy.maternityCost?.toString() ?? null,
    tPremium: policy.tPremium?.toString() ?? null,
    tplus1Premium: policy.tplus1Premium?.toString() ?? null,
    tplusfPremium: policy.tplusfPremium?.toString() ?? null,
    benefitsCostPerPerson: policy.benefitsCostPerPerson?.toString() ?? null,
    maxCoverage: policy.maxCoverage?.toString() ?? null,
    deductible: policy.deductible?.toString() ?? null,
    planName: policy.planName,
    employeeClass: policy.employeeClass,
    cancellationReason: policy.cancellationReason,
    cancelledAt: toDateOnly(policy.cancelledAt),
    createdAt: policy.createdAt.toISOString(),
    updatedAt: policy.updatedAt.toISOString(),
  }
}

import { ERROR_CODES, type GetClaimByIdResponse } from '@friendly-system/shared'
import type { Claim, Prisma } from '@prisma/client'
import { prisma } from '../../shared/db/prisma.js'
import { AppError } from '../../shared/middleware/error-handler.js'
import { logger } from '../../shared/logger.js'

export const CLAIM_BY_ID_RESPONSE_SELECT = {
  id: true,
  claimNumber: true,
  status: true,
  clientId: true,
  client: {
    select: {
      name: true,
    },
  },
  affiliateId: true,
  affiliate: {
    select: {
      firstName: true,
      lastName: true,
    },
  },
  patientId: true,
  patient: {
    select: {
      firstName: true,
      lastName: true,
    },
  },
  policyId: true,
  policy: {
    select: {
      policyNumber: true,
      insurer: {
        select: {
          name: true,
        },
      },
    },
  },
  description: true,
  careType: true,
  diagnosis: true,
  amountSubmitted: true,
  amountApproved: true,
  amountDenied: true,
  amountUnprocessed: true,
  deductibleApplied: true,
  copayApplied: true,
  incidentDate: true,
  submittedDate: true,
  settlementDate: true,
  businessDays: true,
  settlementNumber: true,
  settlementNotes: true,
  createdById: true,
  updatedById: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.ClaimSelect

export type ClaimByIdResponseRecord = Prisma.ClaimGetPayload<{
  select: typeof CLAIM_BY_ID_RESPONSE_SELECT
}>

export async function assertClaimAccess(
  userId: string,
  orgId: string,
  claimId: string,
  scope: string,
): Promise<Claim> {
  const claim = await prisma.claim.findUnique({ where: { id: claimId } })

  if (!claim || claim.orgId !== orgId) {
    logger.warn({ claimId, userId, scope }, 'Claim access with unknown claim')
    throw new AppError(
      404,
      'Claim not found',
      ERROR_CODES.CLAIMS_CLAIM_NOT_FOUND,
    )
  }

  if (scope === 'client') {
    const userClient = await prisma.userClient.findUnique({
      where: { userId_clientId: { userId, clientId: claim.clientId } },
    })

    if (!userClient) {
      logger.warn(
        { claimId, userId, scope },
        'Claim access denied by client scope',
      )
      throw new AppError(
        403,
        'Insufficient permissions',
        ERROR_CODES.PERMISSION_DENIED,
      )
    }
  }

  if (scope === 'own') {
    const affiliate = await prisma.affiliate.findUnique({
      where: { id: claim.affiliateId },
      select: { userId: true },
    })

    if (!affiliate || affiliate.userId !== userId) {
      logger.warn(
        { claimId, userId, scope },
        'Claim access denied by own scope',
      )
      throw new AppError(
        403,
        'Insufficient permissions',
        ERROR_CODES.PERMISSION_DENIED,
      )
    }
  }

  return claim
}

export function toDateOnly(d: Date | null): string | null {
  return d?.toISOString().split('T')[0] ?? null
}

export async function getClaimByIdResponseRecord(
  claimId: string,
): Promise<ClaimByIdResponseRecord | null> {
  return prisma.claim.findUnique({
    where: { id: claimId },
    select: CLAIM_BY_ID_RESPONSE_SELECT,
  })
}

export function toClaimByIdResponse(
  claim: ClaimByIdResponseRecord,
): GetClaimByIdResponse {
  return {
    id: claim.id,
    claimNumber: claim.claimNumber,
    status: claim.status,
    clientId: claim.clientId,
    clientName: claim.client.name,
    affiliateId: claim.affiliateId,
    affiliateFirstName: claim.affiliate.firstName,
    affiliateLastName: claim.affiliate.lastName,
    patientId: claim.patientId,
    patientFirstName: claim.patient.firstName,
    patientLastName: claim.patient.lastName,
    policyId: claim.policyId,
    policyNumber: claim.policy?.policyNumber ?? null,
    policyInsurerName: claim.policy?.insurer.name ?? null,
    description: claim.description,
    careType: claim.careType,
    diagnosis: claim.diagnosis,
    amountSubmitted: claim.amountSubmitted?.toString() ?? null,
    amountApproved: claim.amountApproved?.toString() ?? null,
    amountDenied: claim.amountDenied?.toString() ?? null,
    amountUnprocessed: claim.amountUnprocessed?.toString() ?? null,
    deductibleApplied: claim.deductibleApplied?.toString() ?? null,
    copayApplied: claim.copayApplied?.toString() ?? null,
    incidentDate: toDateOnly(claim.incidentDate),
    submittedDate: toDateOnly(claim.submittedDate),
    settlementDate: toDateOnly(claim.settlementDate),
    businessDays: claim.businessDays,
    settlementNumber: claim.settlementNumber,
    settlementNotes: claim.settlementNotes,
    createdById: claim.createdById,
    updatedById: claim.updatedById,
    createdAt: claim.createdAt.toISOString(),
    updatedAt: claim.updatedAt.toISOString(),
  }
}

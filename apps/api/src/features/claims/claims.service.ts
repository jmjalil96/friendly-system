import type { CreateClaimInput, CreateClaimResponse } from '@friendly-system/shared'
import { ERROR_CODES } from '@friendly-system/shared'
import { prisma } from '../../shared/db/prisma.js'
import { AppError } from '../../shared/middleware/error-handler.js'
import { logger } from '../../shared/logger.js'
import type { RequestContext } from '../../shared/types.js'

export async function createClaim(
  userId: string,
  orgId: string,
  input: CreateClaimInput,
  ctx: RequestContext,
  scope: string,
): Promise<CreateClaimResponse> {
  const { clientId, affiliateId, patientId, description } = input

  // 1. Validate client exists and belongs to org
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, orgId: true, isActive: true },
  })

  if (!client || client.orgId !== orgId) {
    logger.warn({ clientId, userId }, 'Claim attempted with unknown client')
    throw new AppError(
      404,
      'Client not found',
      ERROR_CODES.CLAIMS_CLIENT_NOT_FOUND,
    )
  }

  if (!client.isActive) {
    logger.warn({ clientId, userId }, 'Claim attempted with inactive client')
    throw new AppError(
      422,
      'Client is inactive',
      ERROR_CODES.CLAIMS_CLIENT_INACTIVE,
    )
  }

  // 1b. Enforce client scope
  if (scope === 'client') {
    const userClient = await prisma.userClient.findUnique({
      where: { userId_clientId: { userId, clientId } },
    })
    if (!userClient) {
      logger.warn({ clientId, userId, scope }, 'Claim denied by client scope')
      throw new AppError(
        403,
        'Insufficient permissions',
        ERROR_CODES.PERMISSION_DENIED,
      )
    }
  }

  // 2. Validate affiliate exists, belongs to org, and belongs to client
  const affiliate = await prisma.affiliate.findUnique({
    where: { id: affiliateId },
    select: { id: true, orgId: true, clientId: true, isActive: true, userId: true },
  })

  if (!affiliate || affiliate.orgId !== orgId) {
    logger.warn({ affiliateId, userId }, 'Claim attempted with unknown affiliate')
    throw new AppError(
      404,
      'Affiliate not found',
      ERROR_CODES.CLAIMS_AFFILIATE_NOT_FOUND,
    )
  }

  if (!affiliate.isActive) {
    logger.warn({ affiliateId, userId }, 'Claim attempted with inactive affiliate')
    throw new AppError(
      422,
      'Affiliate is inactive',
      ERROR_CODES.CLAIMS_AFFILIATE_INACTIVE,
    )
  }

  if (affiliate.clientId !== clientId) {
    logger.warn({ affiliateId, clientId, userId }, 'Claim attempted with affiliate-client mismatch')
    throw new AppError(
      422,
      'Affiliate does not belong to the specified client',
      ERROR_CODES.CLAIMS_AFFILIATE_CLIENT_MISMATCH,
    )
  }

  // 2b. Enforce own scope
  if (scope === 'own' && affiliate.userId !== userId) {
    logger.warn({ affiliateId, userId, scope }, 'Claim denied by own scope')
    throw new AppError(
      403,
      'Insufficient permissions',
      ERROR_CODES.PERMISSION_DENIED,
    )
  }

  // 3. Validate patient exists, belongs to org, and is affiliate or their dependent
  const patient = await prisma.affiliate.findUnique({
    where: { id: patientId },
    select: {
      id: true,
      orgId: true,
      clientId: true,
      isActive: true,
      primaryAffiliateId: true,
    },
  })

  if (!patient || patient.orgId !== orgId) {
    logger.warn({ patientId, userId }, 'Claim attempted with unknown patient')
    throw new AppError(
      404,
      'Patient not found',
      ERROR_CODES.CLAIMS_PATIENT_NOT_FOUND,
    )
  }

  if (!patient.isActive) {
    logger.warn({ patientId, userId }, 'Claim attempted with inactive patient')
    throw new AppError(
      422,
      'Patient is inactive',
      ERROR_CODES.CLAIMS_PATIENT_INACTIVE,
    )
  }

  if (patient.clientId !== clientId) {
    logger.warn({ patientId, clientId, userId }, 'Claim attempted with patient-client mismatch')
    throw new AppError(
      422,
      'Patient does not belong to the specified client',
      ERROR_CODES.CLAIMS_PATIENT_CLIENT_MISMATCH,
    )
  }

  const patientIsAffiliate = patientId === affiliateId
  const patientIsDependentOfAffiliate =
    patient.primaryAffiliateId === affiliateId

  if (!patientIsAffiliate && !patientIsDependentOfAffiliate) {
    logger.warn({ patientId, affiliateId, userId }, 'Claim attempted with unrelated patient')
    throw new AppError(
      422,
      'Patient is not the affiliate or one of their dependents',
      ERROR_CODES.CLAIMS_PATIENT_NOT_DEPENDENT,
    )
  }

  // 4. Atomic creation: Claim + ClaimHistory + AuditLog
  const claim = await prisma.$transaction(async (tx) => {
    const newClaim = await tx.claim.create({
      data: {
        orgId,
        clientId,
        affiliateId,
        patientId,
        description,
        status: 'DRAFT',
        createdById: userId,
      },
      select: {
        id: true,
        claimNumber: true,
        status: true,
        clientId: true,
        affiliateId: true,
        patientId: true,
        description: true,
        createdAt: true,
      },
    })

    await tx.claimHistory.create({
      data: {
        claimId: newClaim.id,
        toStatus: 'DRAFT',
        createdById: userId,
      },
    })

    await tx.auditLog.create({
      data: {
        userId,
        orgId,
        action: 'claim.created',
        resource: 'claim',
        resourceId: newClaim.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    })

    return newClaim
  })

  logger.info(
    { claimId: claim.id, claimNumber: claim.claimNumber, userId },
    'Claim created',
  )

  return {
    id: claim.id,
    claimNumber: claim.claimNumber,
    status: claim.status as 'DRAFT',
    clientId: claim.clientId,
    affiliateId: claim.affiliateId,
    patientId: claim.patientId,
    description: claim.description,
    createdAt: claim.createdAt.toISOString(),
  }
}

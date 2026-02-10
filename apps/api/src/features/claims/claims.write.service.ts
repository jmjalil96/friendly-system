import type {
  ClaimInvoiceResponse,
  CreateClaimInput,
  CreateClaimInvoiceInput,
  CreateClaimResponse,
  DeleteClaimInvoiceResponse,
  DeleteClaimResponse,
  GetClaimByIdResponse,
  TransitionClaimInput,
  UpdateClaimInvoiceInput,
  UpdateClaimInput,
} from '@friendly-system/shared'
import {
  canClaimTransition,
  ERROR_CODES,
  getClaimEditableFields,
  getClaimInvariants,
  isClaimReasonRequired,
  type ClaimEditableField,
  type ClaimStatus,
} from '@friendly-system/shared'
import { prisma } from '../../shared/db/prisma.js'
import { AppError } from '../../shared/middleware/error-handler.js'
import { logger } from '../../shared/logger.js'
import type { RequestContext } from '../../shared/types.js'
import {
  assertClaimAccess,
  toClaimByIdResponse,
} from './claims.shared.service.js'

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
    select: {
      id: true,
      orgId: true,
      clientId: true,
      isActive: true,
      userId: true,
    },
  })

  if (!affiliate || affiliate.orgId !== orgId) {
    logger.warn(
      { affiliateId, userId },
      'Claim attempted with unknown affiliate',
    )
    throw new AppError(
      404,
      'Affiliate not found',
      ERROR_CODES.CLAIMS_AFFILIATE_NOT_FOUND,
    )
  }

  if (!affiliate.isActive) {
    logger.warn(
      { affiliateId, userId },
      'Claim attempted with inactive affiliate',
    )
    throw new AppError(
      422,
      'Affiliate is inactive',
      ERROR_CODES.CLAIMS_AFFILIATE_INACTIVE,
    )
  }

  if (affiliate.clientId !== clientId) {
    logger.warn(
      { affiliateId, clientId, userId },
      'Claim attempted with affiliate-client mismatch',
    )
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
    logger.warn(
      { patientId, clientId, userId },
      'Claim attempted with patient-client mismatch',
    )
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
    logger.warn(
      { patientId, affiliateId, userId },
      'Claim attempted with unrelated patient',
    )
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

export async function updateClaim(
  userId: string,
  orgId: string,
  claimId: string,
  input: UpdateClaimInput,
  ctx: RequestContext,
  scope: string,
): Promise<GetClaimByIdResponse> {
  const claim = await assertClaimAccess(userId, orgId, claimId, scope)

  // 4. Validate policyId if provided
  if (
    'policyId' in input &&
    input.policyId !== null &&
    input.policyId !== undefined
  ) {
    const policy = await prisma.policy.findUnique({
      where: { id: input.policyId },
      select: { id: true, orgId: true, clientId: true },
    })

    if (!policy || policy.orgId !== orgId) {
      logger.warn(
        { policyId: input.policyId, userId },
        'Claim update with unknown policy',
      )
      throw new AppError(
        404,
        'Policy not found',
        ERROR_CODES.CLAIMS_POLICY_NOT_FOUND,
      )
    }

    if (policy.clientId !== claim.clientId) {
      logger.warn(
        {
          policyId: input.policyId,
          claimClientId: claim.clientId,
          userId,
        },
        'Claim update with policy-client mismatch',
      )
      throw new AppError(
        422,
        'Policy does not belong to the claim client',
        ERROR_CODES.CLAIMS_POLICY_CLIENT_MISMATCH,
      )
    }
  }

  // 5. Check editable fields for current status
  const editableFields = getClaimEditableFields(claim.status as ClaimStatus)
  const inputFields = Object.keys(input) as ClaimEditableField[]

  const disallowedFields = inputFields.filter(
    (f) => !editableFields.includes(f),
  )
  if (disallowedFields.length > 0) {
    logger.warn(
      { claimId, userId, status: claim.status, disallowedFields },
      'Claim update with non-editable fields',
    )
    throw new AppError(
      422,
      `Fields not editable in ${claim.status} status: ${disallowedFields.join(', ')}`,
      ERROR_CODES.CLAIMS_FIELD_NOT_EDITABLE,
    )
  }

  // 5. Build Prisma update data (convert date strings to Date objects)
  const dateFields = new Set([
    'incidentDate',
    'submittedDate',
    'settlementDate',
  ])
  const data: Record<string, unknown> = { updatedById: userId }
  for (const field of inputFields) {
    const value = input[field as keyof UpdateClaimInput]
    if (dateFields.has(field) && typeof value === 'string') {
      data[field] = new Date(value)
    } else {
      data[field] = value
    }
  }

  // 6. Atomic update: Claim + AuditLog
  const updated = await prisma.$transaction(async (tx) => {
    const updatedClaim = await tx.claim.update({
      where: { id: claimId },
      data,
    })

    await tx.auditLog.create({
      data: {
        userId,
        orgId,
        action: 'claim.updated',
        resource: 'claim',
        resourceId: claimId,
        metadata: {
          changedFields: inputFields,
          claimStatus: claim.status,
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    })

    return updatedClaim
  })

  logger.info({ claimId, userId, fields: inputFields }, 'Claim updated')

  // 7. Return full claim (same shape as getClaimById)
  return toClaimByIdResponse(updated)
}

export async function transitionClaim(
  userId: string,
  orgId: string,
  claimId: string,
  input: TransitionClaimInput,
  ctx: RequestContext,
  scope: string,
): Promise<GetClaimByIdResponse> {
  const claim = await assertClaimAccess(userId, orgId, claimId, scope)

  // 4. Validate transition legality
  if (!canClaimTransition(claim.status as ClaimStatus, input.status)) {
    logger.warn(
      { claimId, userId, fromStatus: claim.status, toStatus: input.status },
      'Claim transition is invalid',
    )
    throw new AppError(
      422,
      `Cannot transition from ${claim.status} to ${input.status}`,
      ERROR_CODES.CLAIMS_INVALID_TRANSITION,
    )
  }

  // 5. Check reason requirement
  if (
    isClaimReasonRequired(claim.status as ClaimStatus, input.status) &&
    !input.reason
  ) {
    logger.warn(
      { claimId, userId, fromStatus: claim.status, toStatus: input.status },
      'Claim transition missing required reason',
    )
    throw new AppError(
      422,
      'Reason is required for this transition',
      ERROR_CODES.CLAIMS_REASON_REQUIRED,
    )
  }

  // 6. Check invariants for target status
  const requiredFields = getClaimInvariants(input.status)
  const claimRecord = claim as unknown as Record<ClaimEditableField, unknown>
  const missingFields = requiredFields.filter((field) => {
    const value = claimRecord[field]
    return value === null || value === undefined
  })

  if (missingFields.length > 0) {
    logger.warn(
      {
        claimId,
        userId,
        toStatus: input.status,
        missingFields,
      },
      'Claim transition blocked by missing invariant fields',
    )
    throw new AppError(
      422,
      `Missing required fields for ${input.status} status: ${missingFields.join(', ')}`,
      ERROR_CODES.CLAIMS_INVARIANT_VIOLATION,
    )
  }

  // 7. Atomic transition: Claim + ClaimHistory + AuditLog
  const updated = await prisma.$transaction(async (tx) => {
    const updatedClaim = await tx.claim.update({
      where: { id: claimId },
      data: { status: input.status, updatedById: userId },
    })

    await tx.claimHistory.create({
      data: {
        claimId,
        fromStatus: claim.status,
        toStatus: input.status,
        reason: input.reason ?? null,
        notes: input.notes ?? null,
        createdById: userId,
      },
    })

    await tx.auditLog.create({
      data: {
        userId,
        orgId,
        action: 'claim.transitioned',
        resource: 'claim',
        resourceId: claimId,
        metadata: {
          fromStatus: claim.status,
          toStatus: input.status,
          reason: input.reason ?? null,
          notes: input.notes ?? null,
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    })

    return updatedClaim
  })

  logger.info(
    {
      claimId,
      userId,
      fromStatus: claim.status,
      toStatus: input.status,
    },
    'Claim transitioned',
  )

  // 8. Return full claim (same shape as getClaimById)
  return toClaimByIdResponse(updated)
}

function toClaimInvoiceResponse(invoice: {
  id: string
  claimId: string
  invoiceNumber: string
  providerName: string
  amountSubmitted: { toString(): string }
  createdById: string
  createdAt: Date
}): ClaimInvoiceResponse {
  return {
    id: invoice.id,
    claimId: invoice.claimId,
    invoiceNumber: invoice.invoiceNumber,
    providerName: invoice.providerName,
    amountSubmitted: invoice.amountSubmitted.toString(),
    createdById: invoice.createdById,
    createdAt: invoice.createdAt.toISOString(),
  }
}

export async function deleteClaim(
  userId: string,
  orgId: string,
  claimId: string,
  ctx: RequestContext,
  scope: string,
): Promise<DeleteClaimResponse> {
  const claim = await assertClaimAccess(userId, orgId, claimId, scope)

  await prisma.$transaction(async (tx) => {
    await tx.claim.delete({ where: { id: claimId } })

    await tx.auditLog.create({
      data: {
        userId,
        orgId,
        action: 'claim.deleted',
        resource: 'claim',
        resourceId: claimId,
        metadata: {
          claimNumber: claim.claimNumber,
          status: claim.status,
          clientId: claim.clientId,
          affiliateId: claim.affiliateId,
          patientId: claim.patientId,
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    })
  })

  logger.info({ claimId, userId }, 'Claim deleted')

  return { message: 'Claim deleted' }
}

export async function createClaimInvoice(
  userId: string,
  orgId: string,
  claimId: string,
  input: CreateClaimInvoiceInput,
  ctx: RequestContext,
  scope: string,
): Promise<ClaimInvoiceResponse> {
  await assertClaimAccess(userId, orgId, claimId, scope)

  const invoice = await prisma.$transaction(async (tx) => {
    const created = await tx.claimInvoice.create({
      data: {
        claimId,
        invoiceNumber: input.invoiceNumber,
        providerName: input.providerName,
        amountSubmitted: input.amountSubmitted,
        createdById: userId,
      },
      select: {
        id: true,
        claimId: true,
        invoiceNumber: true,
        providerName: true,
        amountSubmitted: true,
        createdById: true,
        createdAt: true,
      },
    })

    await tx.auditLog.create({
      data: {
        userId,
        orgId,
        action: 'claim.invoice_created',
        resource: 'claim',
        resourceId: claimId,
        metadata: {
          invoiceId: created.id,
          invoiceNumber: created.invoiceNumber,
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    })

    return created
  })

  logger.info(
    { claimId, invoiceId: invoice.id, userId },
    'Claim invoice created',
  )

  return toClaimInvoiceResponse(invoice)
}

export async function updateClaimInvoice(
  userId: string,
  orgId: string,
  claimId: string,
  invoiceId: string,
  input: UpdateClaimInvoiceInput,
  ctx: RequestContext,
  scope: string,
): Promise<ClaimInvoiceResponse> {
  await assertClaimAccess(userId, orgId, claimId, scope)

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.claimInvoice.updateMany({
      where: { id: invoiceId, claimId },
      data: input,
    })

    if (result.count === 0) {
      logger.warn(
        { claimId, invoiceId, userId, scope },
        'Claim invoice update with unknown invoice',
      )
      throw new AppError(
        404,
        'Claim invoice not found',
        ERROR_CODES.CLAIMS_INVOICE_NOT_FOUND,
      )
    }

    const invoice = await tx.claimInvoice.findFirst({
      where: { id: invoiceId, claimId },
      select: {
        id: true,
        claimId: true,
        invoiceNumber: true,
        providerName: true,
        amountSubmitted: true,
        createdById: true,
        createdAt: true,
      },
    })

    if (!invoice) {
      logger.warn(
        { claimId, invoiceId, userId, scope },
        'Claim invoice update lost invoice after update',
      )
      throw new AppError(
        404,
        'Claim invoice not found',
        ERROR_CODES.CLAIMS_INVOICE_NOT_FOUND,
      )
    }

    await tx.auditLog.create({
      data: {
        userId,
        orgId,
        action: 'claim.invoice_updated',
        resource: 'claim',
        resourceId: claimId,
        metadata: { invoiceId },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    })

    return invoice
  })

  logger.info({ claimId, invoiceId, userId }, 'Claim invoice updated')

  return toClaimInvoiceResponse(updated)
}

export async function deleteClaimInvoice(
  userId: string,
  orgId: string,
  claimId: string,
  invoiceId: string,
  ctx: RequestContext,
  scope: string,
): Promise<DeleteClaimInvoiceResponse> {
  await assertClaimAccess(userId, orgId, claimId, scope)

  await prisma.$transaction(async (tx) => {
    const invoice = await tx.claimInvoice.findFirst({
      where: { id: invoiceId, claimId },
      select: { id: true, invoiceNumber: true },
    })

    if (!invoice) {
      logger.warn(
        { claimId, invoiceId, userId, scope },
        'Claim invoice delete with unknown invoice',
      )
      throw new AppError(
        404,
        'Claim invoice not found',
        ERROR_CODES.CLAIMS_INVOICE_NOT_FOUND,
      )
    }

    const result = await tx.claimInvoice.deleteMany({
      where: { id: invoiceId, claimId },
    })

    if (result.count === 0) {
      logger.warn(
        { claimId, invoiceId, userId, scope },
        'Claim invoice delete lost invoice before deletion',
      )
      throw new AppError(
        404,
        'Claim invoice not found',
        ERROR_CODES.CLAIMS_INVOICE_NOT_FOUND,
      )
    }

    await tx.auditLog.create({
      data: {
        userId,
        orgId,
        action: 'claim.invoice_deleted',
        resource: 'claim',
        resourceId: claimId,
        metadata: {
          invoiceId,
          invoiceNumber: invoice.invoiceNumber,
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    })
  })

  logger.info({ claimId, invoiceId, userId }, 'Claim invoice deleted')

  return { message: 'Claim invoice deleted' }
}

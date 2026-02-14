import type {
  CreatePolicyInput,
  CreatePolicyResponse,
  DeletePolicyResponse,
  GetPolicyByIdResponse,
  TransitionPolicyInput,
  UpdatePolicyInput,
} from '@friendly-system/shared'
import {
  canPolicyTransition,
  ERROR_CODES,
  getPolicyEditableFields,
  getPolicyInvariants,
  isPolicyReasonRequired,
  type PolicyEditableField,
  type PolicyStatus,
} from '@friendly-system/shared'
import { Prisma } from '@prisma/client'
import { getUniqueViolationFields } from '../../shared/db/prisma-errors.js'
import { prisma } from '../../shared/db/prisma.js'
import { AppError } from '../../shared/middleware/error-handler.js'
import { logger } from '../../shared/logger.js'
import type { RequestContext } from '../../shared/types.js'
import {
  POLICY_BY_ID_RESPONSE_SELECT,
  assertPolicyAccess,
  toDateOnly,
  toPolicyByIdResponse,
} from './policies.shared.service.js'

type ClientRecord = {
  id: string
  orgId: string
  isActive: boolean
}

type InsurerRecord = {
  id: string
  orgId: string
  isActive: boolean
}

function mapPolicyUniqueConflict(
  error: Prisma.PrismaClientKnownRequestError,
): AppError | null {
  const fields = getUniqueViolationFields(error)

  if (
    fields.includes('policyNumber') ||
    fields.includes('policy_number') ||
    fields.includes('insurerId') ||
    fields.includes('insurer_id')
  ) {
    return new AppError(
      409,
      'Policy number unavailable for insurer',
      ERROR_CODES.POLICIES_NUMBER_UNAVAILABLE,
    )
  }

  return null
}

async function assertClientExistsAndActive(
  userId: string,
  orgId: string,
  clientId: string,
): Promise<ClientRecord> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, orgId: true, isActive: true },
  })

  if (!client || client.orgId !== orgId) {
    logger.warn({ clientId, userId }, 'Policy write with unknown client')
    throw new AppError(
      404,
      'Client not found',
      ERROR_CODES.POLICIES_CLIENT_NOT_FOUND,
    )
  }

  if (!client.isActive) {
    logger.warn({ clientId, userId }, 'Policy write with inactive client')
    throw new AppError(
      422,
      'Client is inactive',
      ERROR_CODES.POLICIES_CLIENT_INACTIVE,
    )
  }

  return client
}

async function assertInsurerExistsAndActive(
  userId: string,
  orgId: string,
  insurerId: string,
): Promise<InsurerRecord> {
  const insurer = await prisma.insurer.findUnique({
    where: { id: insurerId },
    select: { id: true, orgId: true, isActive: true },
  })

  if (!insurer || insurer.orgId !== orgId) {
    logger.warn({ insurerId, userId }, 'Policy write with unknown insurer')
    throw new AppError(
      404,
      'Insurer not found',
      ERROR_CODES.POLICIES_INSURER_NOT_FOUND,
    )
  }

  if (!insurer.isActive) {
    logger.warn({ insurerId, userId }, 'Policy write with inactive insurer')
    throw new AppError(
      422,
      'Insurer is inactive',
      ERROR_CODES.POLICIES_INSURER_INACTIVE,
    )
  }

  return insurer
}

async function assertClientScope(
  userId: string,
  orgId: string,
  clientId: string,
  scope: string,
): Promise<void> {
  if (scope === 'all') return

  if (scope === 'client') {
    const userClient = await prisma.userClient.findUnique({
      where: { userId_clientId: { userId, clientId } },
    })

    if (!userClient) {
      logger.warn(
        { clientId, userId, scope },
        'Policy write denied by client scope',
      )
      throw new AppError(
        403,
        'Insufficient permissions',
        ERROR_CODES.PERMISSION_DENIED,
      )
    }

    return
  }

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
    logger.warn({ clientId, userId, scope }, 'Policy write denied by own scope')
    throw new AppError(
      403,
      'Insufficient permissions',
      ERROR_CODES.PERMISSION_DENIED,
    )
  }
}

function validateDateRange(startDate: string, endDate: string): void {
  if (startDate <= endDate) return

  throw new AppError(
    422,
    'startDate must not be after endDate',
    ERROR_CODES.VALIDATION_ERROR,
  )
}

export async function createPolicy(
  userId: string,
  orgId: string,
  input: CreatePolicyInput,
  ctx: RequestContext,
  scope: string,
): Promise<CreatePolicyResponse> {
  const { clientId, insurerId, startDate, endDate } = input

  validateDateRange(startDate, endDate)

  await assertClientExistsAndActive(userId, orgId, clientId)
  await assertClientScope(userId, orgId, clientId, scope)
  await assertInsurerExistsAndActive(userId, orgId, insurerId)

  try {
    const policy = await prisma.$transaction(async (tx) => {
      const created = await tx.policy.create({
        data: {
          orgId,
          clientId: input.clientId,
          insurerId: input.insurerId,
          policyNumber: input.policyNumber,
          type: input.type ?? null,
          status: 'PENDING',
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          ambulatoryCoinsurancePct: input.ambulatoryCoinsurancePct,
          hospitalaryCoinsurancePct: input.hospitalaryCoinsurancePct,
          maternityCost: input.maternityCost,
          tPremium: input.tPremium,
          tplus1Premium: input.tplus1Premium,
          tplusfPremium: input.tplusfPremium,
          benefitsCostPerPerson: input.benefitsCostPerPerson,
          maxCoverage: input.maxCoverage,
          deductible: input.deductible,
          planName: input.planName,
          employeeClass: input.employeeClass,
        },
        select: {
          id: true,
          policyNumber: true,
          status: true,
          clientId: true,
          insurerId: true,
          type: true,
          startDate: true,
          endDate: true,
          createdAt: true,
        },
      })

      await tx.policyHistory.create({
        data: {
          policyId: created.id,
          toStatus: 'PENDING',
          createdById: userId,
        },
      })

      await tx.auditLog.create({
        data: {
          userId,
          orgId,
          action: 'policy.created',
          resource: 'policy',
          resourceId: created.id,
          metadata: {
            policyNumber: created.policyNumber,
            status: created.status,
            clientId: created.clientId,
            insurerId: created.insurerId,
          },
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        },
      })

      return created
    })

    logger.info(
      { policyId: policy.id, policyNumber: policy.policyNumber, userId },
      'Policy created',
    )

    return {
      id: policy.id,
      policyNumber: policy.policyNumber,
      status: 'PENDING',
      clientId: policy.clientId,
      insurerId: policy.insurerId,
      type: policy.type,
      startDate: toDateOnly(policy.startDate)!,
      endDate: toDateOnly(policy.endDate)!,
      createdAt: policy.createdAt.toISOString(),
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const mapped = mapPolicyUniqueConflict(error)
      if (mapped) throw mapped
    }

    throw error
  }
}

export async function updatePolicy(
  userId: string,
  orgId: string,
  policyId: string,
  input: UpdatePolicyInput,
  ctx: RequestContext,
  scope: string,
): Promise<GetPolicyByIdResponse> {
  const policy = await assertPolicyAccess(userId, orgId, policyId, scope)

  const editableFields = getPolicyEditableFields(policy.status as PolicyStatus)
  const inputFields = Object.keys(input) as PolicyEditableField[]
  const disallowedFields = inputFields.filter(
    (f) => !editableFields.includes(f),
  )

  if (disallowedFields.length > 0) {
    logger.warn(
      { policyId, userId, status: policy.status, disallowedFields },
      'Policy update with non-editable fields',
    )
    throw new AppError(
      422,
      `Fields not editable in ${policy.status} status: ${disallowedFields.join(', ')}`,
      ERROR_CODES.POLICIES_FIELD_NOT_EDITABLE,
    )
  }

  const nextClientId = input.clientId ?? policy.clientId
  const nextInsurerId = input.insurerId ?? policy.insurerId
  const nextStartDate = input.startDate ?? toDateOnly(policy.startDate)!
  const nextEndDate = input.endDate ?? toDateOnly(policy.endDate)!

  validateDateRange(nextStartDate, nextEndDate)

  if (input.clientId !== undefined) {
    await assertClientExistsAndActive(userId, orgId, input.clientId)
  }
  await assertClientScope(userId, orgId, nextClientId, scope)

  if (input.insurerId !== undefined) {
    await assertInsurerExistsAndActive(userId, orgId, input.insurerId)
  }

  const dateFields = new Set(['startDate', 'endDate'])
  const data: Record<string, unknown> = {}
  for (const field of inputFields) {
    const value = input[field as keyof UpdatePolicyInput]
    if (dateFields.has(field) && typeof value === 'string') {
      data[field] = new Date(value)
    } else {
      data[field] = value
    }
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const updatedPolicy = await tx.policy.update({
        where: { id: policyId },
        data,
        select: POLICY_BY_ID_RESPONSE_SELECT,
      })

      await tx.auditLog.create({
        data: {
          userId,
          orgId,
          action: 'policy.updated',
          resource: 'policy',
          resourceId: policyId,
          metadata: {
            changedFields: inputFields,
            policyStatus: policy.status,
            clientId: nextClientId,
            insurerId: nextInsurerId,
          },
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        },
      })

      return updatedPolicy
    })

    logger.info({ policyId, userId, fields: inputFields }, 'Policy updated')

    return toPolicyByIdResponse(updated)
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const mapped = mapPolicyUniqueConflict(error)
      if (mapped) throw mapped
    }

    throw error
  }
}

export async function transitionPolicy(
  userId: string,
  orgId: string,
  policyId: string,
  input: TransitionPolicyInput,
  ctx: RequestContext,
  scope: string,
): Promise<GetPolicyByIdResponse> {
  const policy = await assertPolicyAccess(userId, orgId, policyId, scope)

  if (!canPolicyTransition(policy.status as PolicyStatus, input.status)) {
    logger.warn(
      { policyId, userId, fromStatus: policy.status, toStatus: input.status },
      'Policy transition is invalid',
    )
    throw new AppError(
      422,
      `Cannot transition from ${policy.status} to ${input.status}`,
      ERROR_CODES.POLICIES_INVALID_TRANSITION,
    )
  }

  if (
    isPolicyReasonRequired(policy.status as PolicyStatus, input.status) &&
    !input.reason
  ) {
    logger.warn(
      { policyId, userId, fromStatus: policy.status, toStatus: input.status },
      'Policy transition missing required reason',
    )
    throw new AppError(
      422,
      'Reason is required for this transition',
      ERROR_CODES.POLICIES_REASON_REQUIRED,
    )
  }

  const requiredFields = getPolicyInvariants(input.status)
  const policyRecord = policy as unknown as Record<PolicyEditableField, unknown>
  const missingFields = requiredFields.filter((field) => {
    const value = policyRecord[field]
    return value === null || value === undefined
  })

  if (missingFields.length > 0) {
    logger.warn(
      {
        policyId,
        userId,
        toStatus: input.status,
        missingFields,
      },
      'Policy transition blocked by missing invariant fields',
    )
    throw new AppError(
      422,
      `Missing required fields for ${input.status} status: ${missingFields.join(', ')}`,
      ERROR_CODES.POLICIES_INVARIANT_VIOLATION,
    )
  }

  const toCancelled = input.status === 'CANCELLED'
  const cancelledAt = toCancelled ? new Date() : null
  const cancellationReason = toCancelled ? (input.reason ?? null) : null

  const updated = await prisma.$transaction(async (tx) => {
    const updatedPolicy = await tx.policy.update({
      where: { id: policyId },
      data: {
        status: input.status,
        cancelledAt,
        cancellationReason,
      },
      select: POLICY_BY_ID_RESPONSE_SELECT,
    })

    await tx.policyHistory.create({
      data: {
        policyId,
        fromStatus: policy.status,
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
        action: 'policy.transitioned',
        resource: 'policy',
        resourceId: policyId,
        metadata: {
          fromStatus: policy.status,
          toStatus: input.status,
          reason: input.reason ?? null,
          notes: input.notes ?? null,
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    })

    return updatedPolicy
  })

  logger.info(
    {
      policyId,
      userId,
      fromStatus: policy.status,
      toStatus: input.status,
    },
    'Policy transitioned',
  )

  return toPolicyByIdResponse(updated)
}

export async function deletePolicy(
  userId: string,
  orgId: string,
  policyId: string,
  ctx: RequestContext,
  scope: string,
): Promise<DeletePolicyResponse> {
  const policy = await assertPolicyAccess(userId, orgId, policyId, scope)

  await prisma.$transaction(async (tx) => {
    await tx.policy.delete({ where: { id: policyId } })

    await tx.auditLog.create({
      data: {
        userId,
        orgId,
        action: 'policy.deleted',
        resource: 'policy',
        resourceId: policyId,
        metadata: {
          policyNumber: policy.policyNumber,
          status: policy.status,
          clientId: policy.clientId,
          insurerId: policy.insurerId,
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    })
  })

  logger.info({ policyId, userId }, 'Policy deleted')

  return { message: 'Policy deleted' }
}

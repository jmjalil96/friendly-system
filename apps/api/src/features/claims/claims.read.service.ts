import type {
  ClaimHistoryQuery,
  ClaimHistoryResponse,
  ClaimInvoiceResponse,
  ClaimInvoicesQuery,
  ClaimInvoicesResponse,
  ClaimTimelineQuery,
  ClaimTimelineResponse,
  GetClaimByIdResponse,
  LookupAffiliatePatientsResponse,
  LookupClientAffiliatesQuery,
  LookupClientAffiliatesResponse,
  LookupClientPoliciesQuery,
  LookupClientPoliciesResponse,
  LookupClientsQuery,
  LookupClientsResponse,
  ListClaimsQuery,
  ListClaimsResponse,
} from '@friendly-system/shared'
import { ERROR_CODES } from '@friendly-system/shared'
import type { Prisma } from '@prisma/client'
import type { ClaimStatus as PrismaClaimStatus } from '@prisma/client'
import { prisma } from '../../shared/db/prisma.js'
import { AppError } from '../../shared/middleware/error-handler.js'
import { logger } from '../../shared/logger.js'
import {
  assertClaimAccess,
  getClaimByIdResponseRecord,
  toClaimByIdResponse,
  toDateOnly,
} from './claims.shared.service.js'

type LookupClientRecord = {
  id: string
  orgId: string
  isActive: boolean
}

type LookupAffiliateRecord = {
  id: string
  orgId: string
  clientId: string
  isActive: boolean
  userId: string | null
}

async function assertLookupClientAccess(
  userId: string,
  orgId: string,
  clientId: string,
  scope: string,
): Promise<LookupClientRecord> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, orgId: true, isActive: true },
  })

  if (!client || client.orgId !== orgId) {
    logger.warn(
      { clientId, userId, scope },
      'Lookup attempted with unknown client',
    )
    throw new AppError(
      404,
      'Client not found',
      ERROR_CODES.CLAIMS_CLIENT_NOT_FOUND,
    )
  }

  if (!client.isActive) {
    logger.warn(
      { clientId, userId, scope },
      'Lookup attempted with inactive client',
    )
    throw new AppError(
      422,
      'Client is inactive',
      ERROR_CODES.CLAIMS_CLIENT_INACTIVE,
    )
  }

  if (scope === 'client') {
    const userClient = await prisma.userClient.findUnique({
      where: { userId_clientId: { userId, clientId } },
    })

    if (!userClient) {
      logger.warn({ clientId, userId, scope }, 'Lookup denied by client scope')
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
      logger.warn({ clientId, userId, scope }, 'Lookup denied by own scope')
      throw new AppError(
        403,
        'Insufficient permissions',
        ERROR_CODES.PERMISSION_DENIED,
      )
    }
  }

  return client
}

async function assertLookupAffiliateAccess(
  userId: string,
  orgId: string,
  affiliateId: string,
  scope: string,
): Promise<LookupAffiliateRecord> {
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
      { affiliateId, userId, scope },
      'Lookup attempted with unknown affiliate',
    )
    throw new AppError(
      404,
      'Affiliate not found',
      ERROR_CODES.CLAIMS_AFFILIATE_NOT_FOUND,
    )
  }

  if (!affiliate.isActive) {
    logger.warn(
      { affiliateId, userId, scope },
      'Lookup attempted with inactive affiliate',
    )
    throw new AppError(
      422,
      'Affiliate is inactive',
      ERROR_CODES.CLAIMS_AFFILIATE_INACTIVE,
    )
  }

  if (scope === 'client') {
    const userClient = await prisma.userClient.findUnique({
      where: { userId_clientId: { userId, clientId: affiliate.clientId } },
    })

    if (!userClient) {
      logger.warn(
        { affiliateId, userId, scope },
        'Lookup denied by client scope',
      )
      throw new AppError(
        403,
        'Insufficient permissions',
        ERROR_CODES.PERMISSION_DENIED,
      )
    }
  }

  if (scope === 'own' && affiliate.userId !== userId) {
    logger.warn({ affiliateId, userId, scope }, 'Lookup denied by own scope')
    throw new AppError(
      403,
      'Insufficient permissions',
      ERROR_CODES.PERMISSION_DENIED,
    )
  }

  return affiliate
}

export async function getClaimById(
  userId: string,
  orgId: string,
  claimId: string,
  scope: string,
): Promise<GetClaimByIdResponse> {
  await assertClaimAccess(userId, orgId, claimId, scope)

  const claim = await getClaimByIdResponseRecord(claimId)

  if (!claim) {
    logger.warn(
      { claimId, userId, scope },
      'Claim lookup lost claim after access check',
    )
    throw new AppError(
      404,
      'Claim not found',
      ERROR_CODES.CLAIMS_CLAIM_NOT_FOUND,
    )
  }

  return toClaimByIdResponse(claim)
}

export async function listClaims(
  userId: string,
  orgId: string,
  query: ListClaimsQuery,
  scope: string,
): Promise<ListClaimsResponse> {
  const { status, search, dateFrom, dateTo, sortBy, sortOrder, page, limit } =
    query

  // 1. Build base WHERE: org isolation
  const where: Prisma.ClaimWhereInput = { orgId }

  // 2. Scope enforcement as WHERE filters
  if (scope === 'client') {
    const userClients = await prisma.userClient.findMany({
      where: { userId },
      select: { clientId: true },
    })
    where.clientId = { in: userClients.map((uc) => uc.clientId) }
  }

  if (scope === 'own') {
    const affiliates = await prisma.affiliate.findMany({
      where: { userId },
      select: { id: true },
    })
    where.affiliateId = { in: affiliates.map((a) => a.id) }
  }

  // 3. Apply filters
  if (status && status.length > 0) {
    where.status = { in: status as PrismaClaimStatus[] }
  }

  if (search) {
    const isNumeric = /^\d+$/.test(search)
    const claimNumber = isNumeric ? parseInt(search, 10) : NaN
    where.OR = [
      ...(Number.isInteger(claimNumber) ? [{ claimNumber }] : []),
      {
        client: {
          name: { contains: search, mode: 'insensitive' as const },
        },
      },
    ]
  }

  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo + 'T23:59:59.999Z') } : {}),
    }
  }

  // 4. Count + fetch in parallel
  const [totalCount, claims] = await Promise.all([
    prisma.claim.count({ where }),
    prisma.claim.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        claimNumber: true,
        status: true,
        clientId: true,
        client: { select: { name: true } },
        affiliateId: true,
        affiliate: { select: { firstName: true, lastName: true } },
        patientId: true,
        patient: { select: { firstName: true, lastName: true } },
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ])

  // 5. Map to response
  return {
    data: claims.map((c) => ({
      id: c.id,
      claimNumber: c.claimNumber,
      status: c.status,
      clientId: c.clientId,
      clientName: c.client.name,
      affiliateId: c.affiliateId,
      affiliateFirstName: c.affiliate.firstName,
      affiliateLastName: c.affiliate.lastName,
      patientId: c.patientId,
      patientFirstName: c.patient.firstName,
      patientLastName: c.patient.lastName,
      description: c.description,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
    meta: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  }
}

export async function lookupClients(
  userId: string,
  orgId: string,
  query: LookupClientsQuery,
  scope: string,
): Promise<LookupClientsResponse> {
  const { search, page, limit } = query

  const where: Prisma.ClientWhereInput = {
    orgId,
    isActive: true,
  }

  if (scope === 'client') {
    const userClients = await prisma.userClient.findMany({
      where: { userId },
      select: { clientId: true },
    })
    where.id = { in: userClients.map((uc) => uc.clientId) }
  }

  if (scope === 'own') {
    const affiliates = await prisma.affiliate.findMany({
      where: {
        orgId,
        userId,
        isActive: true,
      },
      select: { clientId: true },
    })
    const clientIds = [...new Set(affiliates.map((a) => a.clientId))]
    where.id = { in: clientIds }
  }

  if (search) {
    where.name = {
      contains: search,
      mode: 'insensitive',
    }
  }

  const [totalCount, clients] = await Promise.all([
    prisma.client.count({ where }),
    prisma.client.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
      },
    }),
  ])

  return {
    data: clients,
    meta: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  }
}

export async function lookupClientAffiliates(
  userId: string,
  orgId: string,
  clientId: string,
  query: LookupClientAffiliatesQuery,
  scope: string,
): Promise<LookupClientAffiliatesResponse> {
  await assertLookupClientAccess(userId, orgId, clientId, scope)

  const { search, page, limit } = query

  const where: Prisma.AffiliateWhereInput = {
    orgId,
    clientId,
    isActive: true,
    primaryAffiliateId: null,
  }

  if (scope === 'own') {
    where.userId = userId
  }

  if (search) {
    where.OR = [
      {
        firstName: {
          contains: search,
          mode: 'insensitive',
        },
      },
      {
        lastName: {
          contains: search,
          mode: 'insensitive',
        },
      },
      {
        documentNumber: {
          contains: search,
          mode: 'insensitive',
        },
      },
    ]
  }

  const [totalCount, affiliates] = await Promise.all([
    prisma.affiliate.count({ where }),
    prisma.affiliate.findMany({
      where,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        documentType: true,
        documentNumber: true,
      },
    }),
  ])

  return {
    data: affiliates,
    meta: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  }
}

export async function lookupAffiliatePatients(
  userId: string,
  orgId: string,
  affiliateId: string,
  scope: string,
): Promise<LookupAffiliatePatientsResponse> {
  await assertLookupAffiliateAccess(userId, orgId, affiliateId, scope)

  const patients = await prisma.affiliate.findMany({
    where: {
      orgId,
      isActive: true,
      OR: [{ id: affiliateId }, { primaryAffiliateId: affiliateId }],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      relationship: true,
      documentType: true,
      documentNumber: true,
    },
  })

  patients.sort((a, b) => {
    if (a.id === affiliateId && b.id !== affiliateId) return -1
    if (b.id === affiliateId && a.id !== affiliateId) return 1

    const byLastName = a.lastName.localeCompare(b.lastName)
    if (byLastName !== 0) return byLastName

    return a.firstName.localeCompare(b.firstName)
  })

  return { data: patients }
}

export async function lookupClientPolicies(
  userId: string,
  orgId: string,
  clientId: string,
  query: LookupClientPoliciesQuery,
  scope: string,
): Promise<LookupClientPoliciesResponse> {
  await assertLookupClientAccess(userId, orgId, clientId, scope)

  const { search, page, limit } = query

  const where: Prisma.PolicyWhereInput = {
    orgId,
    clientId,
  }

  if (search) {
    where.policyNumber = {
      contains: search,
      mode: 'insensitive',
    }
  }

  const [totalCount, policies] = await Promise.all([
    prisma.policy.count({ where }),
    prisma.policy.findMany({
      where,
      orderBy: { startDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        policyNumber: true,
        type: true,
        status: true,
        startDate: true,
        endDate: true,
        insurer: {
          select: {
            name: true,
          },
        },
      },
    }),
  ])

  return {
    data: policies.map((policy) => ({
      id: policy.id,
      policyNumber: policy.policyNumber,
      type: policy.type,
      status: policy.status,
      startDate: toDateOnly(policy.startDate)!,
      endDate: toDateOnly(policy.endDate)!,
      insurerName: policy.insurer.name,
    })),
    meta: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  }
}

export async function getClaimHistory(
  userId: string,
  orgId: string,
  claimId: string,
  query: ClaimHistoryQuery,
  scope: string,
): Promise<ClaimHistoryResponse> {
  await assertClaimAccess(userId, orgId, claimId, scope)

  const { page, limit } = query

  const [totalCount, history] = await Promise.all([
    prisma.claimHistory.count({ where: { claimId } }),
    prisma.claimHistory.findMany({
      where: { claimId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        claimId: true,
        fromStatus: true,
        toStatus: true,
        reason: true,
        notes: true,
        createdById: true,
        createdAt: true,
      },
    }),
  ])

  return {
    data: history.map((entry) => ({
      ...entry,
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

const CLAIM_TIMELINE_ACTIONS = [
  'claim.created',
  'claim.updated',
  'claim.transitioned',
  'claim.deleted',
  'claim.invoice_created',
  'claim.invoice_updated',
  'claim.invoice_deleted',
] as const

export async function getClaimTimeline(
  userId: string,
  orgId: string,
  claimId: string,
  query: ClaimTimelineQuery,
  scope: string,
): Promise<ClaimTimelineResponse> {
  await assertClaimAccess(userId, orgId, claimId, scope)

  const { page, limit } = query

  const where: Prisma.AuditLogWhereInput = {
    orgId,
    resource: 'claim',
    resourceId: claimId,
    action: { in: [...CLAIM_TIMELINE_ACTIONS] },
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
        ipAddress: true,
        userAgent: true,
        metadata: true,
        createdAt: true,
      },
    }),
  ])

  return {
    data: timeline.map((entry) => ({
      ...entry,
      action: entry.action as ClaimTimelineResponse['data'][number]['action'],
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

export async function listClaimInvoices(
  userId: string,
  orgId: string,
  claimId: string,
  query: ClaimInvoicesQuery,
  scope: string,
): Promise<ClaimInvoicesResponse> {
  await assertClaimAccess(userId, orgId, claimId, scope)

  const { page, limit } = query

  const [totalCount, invoices] = await Promise.all([
    prisma.claimInvoice.count({ where: { claimId } }),
    prisma.claimInvoice.findMany({
      where: { claimId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        claimId: true,
        invoiceNumber: true,
        providerName: true,
        amountSubmitted: true,
        createdById: true,
        createdAt: true,
      },
    }),
  ])

  return {
    data: invoices.map((invoice) => ({
      id: invoice.id,
      claimId: invoice.claimId,
      invoiceNumber: invoice.invoiceNumber,
      providerName: invoice.providerName,
      amountSubmitted: invoice.amountSubmitted.toString(),
      createdById: invoice.createdById,
      createdAt: invoice.createdAt.toISOString(),
    })),
    meta: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  }
}

export async function getClaimInvoice(
  userId: string,
  orgId: string,
  claimId: string,
  invoiceId: string,
  scope: string,
): Promise<ClaimInvoiceResponse> {
  await assertClaimAccess(userId, orgId, claimId, scope)

  const invoice = await prisma.claimInvoice.findFirst({
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
      'Claim invoice lookup with unknown invoice',
    )
    throw new AppError(
      404,
      'Claim invoice not found',
      ERROR_CODES.CLAIMS_INVOICE_NOT_FOUND,
    )
  }

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

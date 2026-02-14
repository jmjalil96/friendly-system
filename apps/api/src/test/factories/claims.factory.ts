import { randomUUID } from 'node:crypto'
import { prisma } from '../../shared/db/prisma.js'

export interface ClientFixture {
  id: string
  orgId: string
  name: string
}

export async function createClient(
  orgId: string,
  overrides: { name?: string; isActive?: boolean } = {},
): Promise<ClientFixture> {
  const client = await prisma.client.create({
    data: {
      orgId,
      name: overrides.name ?? `Test Client ${Date.now()}`,
      isActive: overrides.isActive ?? true,
    },
    select: { id: true, orgId: true, name: true },
  })
  return client
}

export interface AffiliateFixture {
  id: string
  orgId: string
  clientId: string
  firstName: string
  lastName: string
}

export async function createAffiliate(
  orgId: string,
  clientId: string,
  overrides: {
    firstName?: string
    lastName?: string
    isActive?: boolean
    primaryAffiliateId?: string
    userId?: string
  } = {},
): Promise<AffiliateFixture> {
  let userIdForCreate = overrides.userId
  if (overrides.userId) {
    const existingUserAffiliate = await prisma.affiliate.findUnique({
      where: { userId: overrides.userId },
      select: { id: true },
    })
    if (existingUserAffiliate) {
      userIdForCreate = undefined
    }
  }

  const affiliate = await prisma.affiliate.create({
    data: {
      orgId,
      clientId,
      firstName: overrides.firstName ?? 'Test',
      lastName: overrides.lastName ?? 'Affiliate',
      isActive: overrides.isActive ?? true,
      primaryAffiliateId: overrides.primaryAffiliateId,
      userId: userIdForCreate,
    },
    select: {
      id: true,
      orgId: true,
      clientId: true,
      firstName: true,
      lastName: true,
    },
  })
  return affiliate
}

export async function createUserClient(
  userId: string,
  clientId: string,
): Promise<{ userId: string; clientId: string }> {
  return prisma.userClient.create({
    data: { userId, clientId },
  })
}

export async function linkAffiliateToUser(
  affiliateId: string,
  userId: string,
): Promise<void> {
  await prisma.affiliate.update({
    where: { id: affiliateId },
    data: { userId },
  })
}

export async function createInsurer(
  orgId: string,
  overrides: { name?: string } = {},
): Promise<{ id: string; name: string }> {
  return prisma.insurer.create({
    data: {
      orgId,
      name: overrides.name ?? `Test Insurer ${Date.now()}`,
      type: 'MEDICINA_PREPAGADA',
    },
    select: { id: true, name: true },
  })
}

export async function createPolicy(
  orgId: string,
  clientId: string,
  insurerId: string,
  overrides: {
    startDate?: Date
    endDate?: Date
    planName?: string
    employeeClass?: string
    maxCoverage?: string
    deductible?: string
  } = {},
): Promise<{
  id: string
  orgId: string
  clientId: string
  policyNumber: string
}> {
  return prisma.policy.create({
    data: {
      orgId,
      clientId,
      insurerId,
      policyNumber: `POL-${randomUUID().slice(0, 8)}`,
      startDate: overrides.startDate ?? new Date('2025-01-01'),
      endDate: overrides.endDate ?? new Date('2026-12-31'),
      planName: overrides.planName ?? 'Plan Estándar',
      employeeClass: overrides.employeeClass ?? 'General',
      maxCoverage: overrides.maxCoverage ?? '500000.00',
      deductible: overrides.deductible ?? '1000.00',
    },
    select: { id: true, orgId: true, clientId: true, policyNumber: true },
  })
}

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
  const affiliate = await prisma.affiliate.create({
    data: {
      orgId,
      clientId,
      firstName: overrides.firstName ?? 'Test',
      lastName: overrides.lastName ?? 'Affiliate',
      isActive: overrides.isActive ?? true,
      primaryAffiliateId: overrides.primaryAffiliateId,
      userId: overrides.userId,
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

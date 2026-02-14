import { describe, expect, it } from 'vitest'
import request from 'supertest'
import {
  API_ROUTES,
  ERROR_CODES,
  ROLES,
  claimHistoryResponseSchema,
  claimInvoiceResponseSchema,
  claimInvoicesResponseSchema,
  claimTimelineResponseSchema,
  getClaimByIdResponseSchema,
  lookupAffiliatePatientsResponseSchema,
  lookupClientAffiliatesResponseSchema,
  lookupClientPoliciesResponseSchema,
  lookupClientsResponseSchema,
  listClaimsResponseSchema,
  listClaimsItemSchema,
} from '@friendly-system/shared'
import { prisma } from '../../../shared/db/prisma.js'
import { createVerifiedUser } from '../../../test/factories/auth.factory.js'
import {
  createAffiliate,
  createClient,
  createInsurer,
  createPolicy,
  createUserClient,
} from '../../../test/factories/claims.factory.js'
import {
  app,
  authenticatedAgent,
  expectError,
} from './claims.integration.shared.js'

describe('GET /claims/:id', () => {
  function claimUrl(id: string) {
    return API_ROUTES.claims.getById.replace(':id', id)
  }

  async function createTestClaim(
    agent: request.Agent,
    clientId: string,
    affiliateId: string,
    patientId: string,
  ) {
    const response = await agent.post(API_ROUTES.claims.create).send({
      clientId,
      affiliateId,
      patientId,
      description: 'Test claim for GET',
    })
    expect(response.status).toBe(201)
    return response.body as { id: string }
  }

  describe('authentication guard', () => {
    it('requires authentication', async () => {
      const response = await request(app).get(
        claimUrl('a0000000-0000-4000-8000-000000000000'),
      )

      expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
    })
  })

  describe('input validation', () => {
    it('rejects invalid UUID param', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.get(claimUrl('not-a-uuid'))

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('claim lookup', () => {
    it('returns 404 when claim does not exist', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.get(
        claimUrl('a0000000-0000-4000-8000-000000000001'),
      )

      expectError(
        response,
        404,
        ERROR_CODES.CLAIMS_CLAIM_NOT_FOUND,
        'Claim not found',
      )
    })

    it('returns 404 when claim belongs to a different org', async () => {
      const { agent: otherAgent, user: otherUser } = await authenticatedAgent()
      const otherClient = await createClient(otherUser.orgId)
      const otherAffiliate = await createAffiliate(
        otherUser.orgId,
        otherClient.id,
      )
      const { id: claimId } = await createTestClaim(
        otherAgent,
        otherClient.id,
        otherAffiliate.id,
        otherAffiliate.id,
      )

      const { agent } = await authenticatedAgent()

      const response = await agent.get(claimUrl(claimId))

      expectError(
        response,
        404,
        ERROR_CODES.CLAIMS_CLAIM_NOT_FOUND,
        'Claim not found',
      )
    })
  })

  describe('successful retrieval', () => {
    it('returns claim with all fields and matches schema', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )

      const response = await agent.get(claimUrl(claimId))

      expect(response.status).toBe(200)

      const parsed = getClaimByIdResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.id).toBe(claimId)
      expect(parsed.data.status).toBe('DRAFT')
      expect(parsed.data.clientId).toBe(client.id)
      expect(parsed.data.clientName).toBe(client.name)
      expect(parsed.data.affiliateId).toBe(affiliate.id)
      expect(parsed.data.affiliateFirstName).toBe(affiliate.firstName)
      expect(parsed.data.affiliateLastName).toBe(affiliate.lastName)
      expect(parsed.data.patientId).toBe(affiliate.id)
      expect(parsed.data.patientFirstName).toBe(affiliate.firstName)
      expect(parsed.data.patientLastName).toBe(affiliate.lastName)
      expect(parsed.data.description).toBe('Test claim for GET')
      expect(parsed.data.policyId).toBeNull()
      expect(parsed.data.policyNumber).toBeNull()
      expect(parsed.data.policyInsurerName).toBeNull()
      expect(parsed.data.careType).toBeNull()
      expect(parsed.data.diagnosis).toBeNull()
      expect(parsed.data.createdById).toBe(user.userId)
      expect(typeof parsed.data.claimNumber).toBe('number')
    })
  })

  describe('permission scoping', () => {
    it('rejects user with no claims:read permission', async () => {
      const noPermRole = await prisma.role.create({
        data: { name: 'NO_READ_PERMS', description: 'No permissions' },
      })
      const user = await createVerifiedUser(app)
      await prisma.user.update({
        where: { id: user.userId },
        data: { roleId: noPermRole.id },
      })

      const agent = request.agent(app)
      await agent.post(API_ROUTES.auth.login).send({
        email: user.email,
        password: user.password,
      })

      const response = await agent.get(
        claimUrl('a0000000-0000-4000-8000-000000000001'),
      )

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })

    describe('all scope (OWNER)', () => {
      it('reads any claim in org without user_clients entry', async () => {
        const { agent, user } = await authenticatedAgent()
        const client = await createClient(user.orgId)
        const affiliate = await createAffiliate(user.orgId, client.id)
        const { id: claimId } = await createTestClaim(
          agent,
          client.id,
          affiliate.id,
          affiliate.id,
        )

        const response = await agent.get(claimUrl(claimId))

        expect(response.status).toBe(200)
      })
    })

    describe('client scope (ADMIN)', () => {
      it('returns 403 when user has no user_clients entry', async () => {
        const { agent, user } = await authenticatedAgent(ROLES.ADMIN)
        const client = await createClient(user.orgId)
        const affiliate = await createAffiliate(user.orgId, client.id)

        const claim = await prisma.claim.create({
          data: {
            orgId: user.orgId,
            clientId: client.id,
            affiliateId: affiliate.id,
            patientId: affiliate.id,
            description: 'Admin test claim',
            status: 'DRAFT',
            createdById: user.userId,
          },
        })

        const response = await agent.get(claimUrl(claim.id))

        expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
      })

      it('reads claim when user has user_clients entry', async () => {
        const { agent, user } = await authenticatedAgent(ROLES.ADMIN)
        const client = await createClient(user.orgId)
        await createUserClient(user.userId, client.id)
        const affiliate = await createAffiliate(user.orgId, client.id)

        const claim = await prisma.claim.create({
          data: {
            orgId: user.orgId,
            clientId: client.id,
            affiliateId: affiliate.id,
            patientId: affiliate.id,
            description: 'Admin client-scoped read',
            status: 'DRAFT',
            createdById: user.userId,
          },
        })

        const response = await agent.get(claimUrl(claim.id))

        expect(response.status).toBe(200)
        const parsed = getClaimByIdResponseSchema.safeParse(response.body)
        expect(parsed.success).toBe(true)
      })

      it('returns 403 for a claim under a different client', async () => {
        const { agent, user } = await authenticatedAgent(ROLES.ADMIN)
        const clientA = await createClient(user.orgId)
        const clientB = await createClient(user.orgId)
        await createUserClient(user.userId, clientA.id)
        const affiliate = await createAffiliate(user.orgId, clientB.id)

        const claim = await prisma.claim.create({
          data: {
            orgId: user.orgId,
            clientId: clientB.id,
            affiliateId: affiliate.id,
            patientId: affiliate.id,
            description: 'Wrong client read',
            status: 'DRAFT',
            createdById: user.userId,
          },
        })

        const response = await agent.get(claimUrl(claim.id))

        expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
      })
    })

    describe('own scope (MEMBER)', () => {
      it('returns 403 when affiliate userId does not match', async () => {
        const { agent, user } = await authenticatedAgent(ROLES.MEMBER)
        const client = await createClient(user.orgId)
        const affiliate = await createAffiliate(user.orgId, client.id)

        const claim = await prisma.claim.create({
          data: {
            orgId: user.orgId,
            clientId: client.id,
            affiliateId: affiliate.id,
            patientId: affiliate.id,
            description: 'Unlinked affiliate read',
            status: 'DRAFT',
            createdById: user.userId,
          },
        })

        const response = await agent.get(claimUrl(claim.id))

        expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
      })

      it('reads claim when affiliate userId matches', async () => {
        const { agent, user } = await authenticatedAgent(ROLES.MEMBER)
        const client = await createClient(user.orgId)
        const affiliate = await createAffiliate(user.orgId, client.id, {
          userId: user.userId,
        })

        const claim = await prisma.claim.create({
          data: {
            orgId: user.orgId,
            clientId: client.id,
            affiliateId: affiliate.id,
            patientId: affiliate.id,
            description: 'Own-scoped read',
            status: 'DRAFT',
            createdById: user.userId,
          },
        })

        const response = await agent.get(claimUrl(claim.id))

        expect(response.status).toBe(200)
        const parsed = getClaimByIdResponseSchema.safeParse(response.body)
        expect(parsed.success).toBe(true)
      })

      it('returns 403 for a claim under a different affiliate', async () => {
        const { agent, user } = await authenticatedAgent(ROLES.MEMBER)
        const client = await createClient(user.orgId)
        await createAffiliate(user.orgId, client.id, {
          userId: user.userId,
        })
        const otherAffiliate = await createAffiliate(user.orgId, client.id)

        const claim = await prisma.claim.create({
          data: {
            orgId: user.orgId,
            clientId: client.id,
            affiliateId: otherAffiliate.id,
            patientId: otherAffiliate.id,
            description: 'Wrong affiliate read',
            status: 'DRAFT',
            createdById: user.userId,
          },
        })

        const response = await agent.get(claimUrl(claim.id))

        expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
      })
    })
  })
})

describe('GET /claims', () => {
  async function createTestClaim(
    agent: request.Agent,
    clientId: string,
    affiliateId: string,
    patientId: string,
    description = 'Test claim for list',
  ) {
    const response = await agent.post(API_ROUTES.claims.create).send({
      clientId,
      affiliateId,
      patientId,
      description,
    })
    expect(response.status).toBe(201)
    return response.body as { id: string; claimNumber: number }
  }

  describe('authentication guard', () => {
    it('requires authentication', async () => {
      const response = await request(app).get(API_ROUTES.claims.list)

      expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
    })
  })

  describe('input validation', () => {
    it('rejects invalid status value', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .get(API_ROUTES.claims.list)
        .query({ status: 'INVALID' })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects page < 1', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .get(API_ROUTES.claims.list)
        .query({ page: 0 })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects limit > 100', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .get(API_ROUTES.claims.list)
        .query({ limit: 101 })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects page > 1000', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .get(API_ROUTES.claims.list)
        .query({ page: 1001 })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects dateFrom after dateTo', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .get(API_ROUTES.claims.list)
        .query({ dateFrom: '2026-02-10', dateTo: '2026-02-01' })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('successful listing', () => {
    it('returns empty list with meta when no claims exist', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.get(API_ROUTES.claims.list)

      expect(response.status).toBe(200)
      const parsed = listClaimsResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.data).toHaveLength(0)
      expect(parsed.data.meta.page).toBe(1)
      expect(parsed.data.meta.limit).toBe(20)
      expect(parsed.data.meta.totalCount).toBe(0)
      expect(parsed.data.meta.totalPages).toBe(0)
    })

    it('returns claims with correct item shape and meta', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      await createTestClaim(agent, client.id, affiliate.id, affiliate.id)

      const response = await agent.get(API_ROUTES.claims.list)

      expect(response.status).toBe(200)
      const parsed = listClaimsResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.data).toHaveLength(1)
      expect(parsed.data.meta.totalCount).toBe(1)
      expect(parsed.data.meta.totalPages).toBe(1)

      const item = parsed.data.data[0]!
      const itemParsed = listClaimsItemSchema.safeParse(item)
      expect(itemParsed.success).toBe(true)

      expect(item.clientId).toBe(client.id)
      expect(item.clientName).toBe(client.name)
      expect(item.affiliateId).toBe(affiliate.id)
      expect(item.affiliateFirstName).toBe(affiliate.firstName)
      expect(item.affiliateLastName).toBe(affiliate.lastName)
    })

    it('returns default pagination (page 1, limit 20)', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.get(API_ROUTES.claims.list)

      expect(response.status).toBe(200)
      const parsed = listClaimsResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.meta.page).toBe(1)
      expect(parsed.data.meta.limit).toBe(20)
    })
  })

  describe('filtering', () => {
    it('filters by single status', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      await createTestClaim(agent, client.id, affiliate.id, affiliate.id)

      // Update one claim to SUBMITTED
      const claims = await prisma.claim.findMany({
        where: { orgId: user.orgId },
      })
      await prisma.claim.update({
        where: { id: claims[0]!.id },
        data: { status: 'SUBMITTED' },
      })

      const response = await agent
        .get(API_ROUTES.claims.list)
        .query({ status: 'SUBMITTED' })

      expect(response.status).toBe(200)
      const parsed = listClaimsResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.data).toHaveLength(1)
      expect(parsed.data.data[0]!.status).toBe('SUBMITTED')
    })

    it('filters by multiple statuses', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
        'Claim 1',
      )
      await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
        'Claim 2',
      )

      // Update one to SUBMITTED
      const claims = await prisma.claim.findMany({
        where: { orgId: user.orgId },
        orderBy: { createdAt: 'asc' },
      })
      await prisma.claim.update({
        where: { id: claims[0]!.id },
        data: { status: 'SUBMITTED' },
      })

      const response = await agent
        .get(API_ROUTES.claims.list)
        .query({ status: ['DRAFT', 'SUBMITTED'] })

      expect(response.status).toBe(200)
      const parsed = listClaimsResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.data).toHaveLength(2)
    })

    it('filters by dateFrom and dateTo', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      await createTestClaim(agent, client.id, affiliate.id, affiliate.id)

      // Use today's date range
      const today = new Date().toISOString().split('T')[0]!

      const response = await agent
        .get(API_ROUTES.claims.list)
        .query({ dateFrom: today, dateTo: today })

      expect(response.status).toBe(200)
      const parsed = listClaimsResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.data).toHaveLength(1)
    })

    it('search matches claimNumber', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const claim = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )

      const response = await agent
        .get(API_ROUTES.claims.list)
        .query({ search: String(claim.claimNumber) })

      expect(response.status).toBe(200)
      const parsed = listClaimsResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.data).toHaveLength(1)
      expect(parsed.data.data[0]!.claimNumber).toBe(claim.claimNumber)
    })

    it('search matches client name (case-insensitive)', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId, { name: 'Acme Corp' })
      const affiliate = await createAffiliate(user.orgId, client.id)
      await createTestClaim(agent, client.id, affiliate.id, affiliate.id)

      const response = await agent
        .get(API_ROUTES.claims.list)
        .query({ search: 'acme' })

      expect(response.status).toBe(200)
      const parsed = listClaimsResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.data).toHaveLength(1)
      expect(parsed.data.data[0]!.clientName).toBe('Acme Corp')
    })

    it('search returns empty when no match', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      await createTestClaim(agent, client.id, affiliate.id, affiliate.id)

      const response = await agent
        .get(API_ROUTES.claims.list)
        .query({ search: 'nonexistent-xyz' })

      expect(response.status).toBe(200)
      const parsed = listClaimsResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.data).toHaveLength(0)
      expect(parsed.data.meta.totalCount).toBe(0)
    })

    it('search does not match claim number on mixed alphanumeric input', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId, { name: 'ZZZ Unique Corp' })
      const affiliate = await createAffiliate(user.orgId, client.id)
      await createTestClaim(agent, client.id, affiliate.id, affiliate.id)

      const response = await agent
        .get(API_ROUTES.claims.list)
        .query({ search: '1abc' })

      expect(response.status).toBe(200)
      const parsed = listClaimsResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.data).toHaveLength(0)
    })
  })

  describe('sorting', () => {
    it('sorts by createdAt desc (default)', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
        'First',
      )
      await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
        'Second',
      )

      const response = await agent.get(API_ROUTES.claims.list)

      expect(response.status).toBe(200)
      const parsed = listClaimsResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.data).toHaveLength(2)
      // desc: most recent first
      expect(parsed.data.data[0]!.description).toBe('Second')
      expect(parsed.data.data[1]!.description).toBe('First')
    })

    it('sorts by claimNumber asc', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const claim1 = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
        'First',
      )
      const claim2 = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
        'Second',
      )

      const response = await agent
        .get(API_ROUTES.claims.list)
        .query({ sortBy: 'claimNumber', sortOrder: 'asc' })

      expect(response.status).toBe(200)
      const parsed = listClaimsResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.data).toHaveLength(2)
      expect(parsed.data.data[0]!.claimNumber).toBe(claim1.claimNumber)
      expect(parsed.data.data[1]!.claimNumber).toBe(claim2.claimNumber)
    })

    it('sorts by updatedAt desc', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
        'First',
      )
      await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
        'Second',
      )

      // Touch first claim to update its updatedAt
      const claims = await prisma.claim.findMany({
        where: { orgId: user.orgId, description: 'First' },
      })
      await prisma.claim.update({
        where: { id: claims[0]!.id },
        data: { description: 'First updated' },
      })

      const response = await agent
        .get(API_ROUTES.claims.list)
        .query({ sortBy: 'updatedAt', sortOrder: 'desc' })

      expect(response.status).toBe(200)
      const parsed = listClaimsResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.data).toHaveLength(2)
      // "First updated" was touched most recently
      expect(parsed.data.data[0]!.description).toBe('First updated')
    })
  })

  describe('pagination', () => {
    it('respects page and limit', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
        'Claim 1',
      )
      await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
        'Claim 2',
      )
      await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
        'Claim 3',
      )

      const response = await agent
        .get(API_ROUTES.claims.list)
        .query({ page: 2, limit: 1, sortBy: 'claimNumber', sortOrder: 'asc' })

      expect(response.status).toBe(200)
      const parsed = listClaimsResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.data).toHaveLength(1)
      expect(parsed.data.meta.page).toBe(2)
      expect(parsed.data.meta.limit).toBe(1)
      expect(parsed.data.meta.totalCount).toBe(3)
      expect(parsed.data.meta.totalPages).toBe(3)
    })

    it('returns correct totalCount and totalPages', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      for (let i = 0; i < 5; i++) {
        await createTestClaim(
          agent,
          client.id,
          affiliate.id,
          affiliate.id,
          `Claim ${i}`,
        )
      }

      const response = await agent
        .get(API_ROUTES.claims.list)
        .query({ limit: 2 })

      expect(response.status).toBe(200)
      const parsed = listClaimsResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.data).toHaveLength(2)
      expect(parsed.data.meta.totalCount).toBe(5)
      expect(parsed.data.meta.totalPages).toBe(3)
    })

    it('returns empty data for page beyond range', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      await createTestClaim(agent, client.id, affiliate.id, affiliate.id)

      const response = await agent
        .get(API_ROUTES.claims.list)
        .query({ page: 99 })

      expect(response.status).toBe(200)
      const parsed = listClaimsResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.data).toHaveLength(0)
      expect(parsed.data.meta.totalCount).toBe(1)
      expect(parsed.data.meta.page).toBe(99)
    })
  })

  describe('permission scoping', () => {
    it('rejects user with no claims:read permission', async () => {
      const noPermRole = await prisma.role.create({
        data: { name: 'NO_LIST_PERMS', description: 'No permissions' },
      })
      const user = await createVerifiedUser(app)
      await prisma.user.update({
        where: { id: user.userId },
        data: { roleId: noPermRole.id },
      })

      const agent = request.agent(app)
      await agent.post(API_ROUTES.auth.login).send({
        email: user.email,
        password: user.password,
      })

      const response = await agent.get(API_ROUTES.claims.list)

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })

    describe('all scope (OWNER)', () => {
      it('returns all claims in org', async () => {
        const { agent, user } = await authenticatedAgent()
        const client = await createClient(user.orgId)
        const affiliate = await createAffiliate(user.orgId, client.id)
        await createTestClaim(agent, client.id, affiliate.id, affiliate.id)

        const response = await agent.get(API_ROUTES.claims.list)

        expect(response.status).toBe(200)
        const parsed = listClaimsResponseSchema.safeParse(response.body)
        expect(parsed.success).toBe(true)
        if (!parsed.success) return

        expect(parsed.data.data).toHaveLength(1)
      })
    })

    describe('client scope (ADMIN)', () => {
      it('returns only claims for assigned clients', async () => {
        const { agent: ownerAgent, user: owner } = await authenticatedAgent()
        const clientA = await createClient(owner.orgId)
        const clientB = await createClient(owner.orgId)
        const affiliateA = await createAffiliate(owner.orgId, clientA.id)
        const affiliateB = await createAffiliate(owner.orgId, clientB.id)
        await createTestClaim(
          ownerAgent,
          clientA.id,
          affiliateA.id,
          affiliateA.id,
          'Client A claim',
        )
        await createTestClaim(
          ownerAgent,
          clientB.id,
          affiliateB.id,
          affiliateB.id,
          'Client B claim',
        )

        const { agent: adminAgent, user: admin } = await authenticatedAgent(
          ROLES.ADMIN,
        )
        // Move admin to same org
        await prisma.user.update({
          where: { id: admin.userId },
          data: { orgId: owner.orgId },
        })
        await createUserClient(admin.userId, clientA.id)

        // Re-login to refresh session
        await adminAgent.post(API_ROUTES.auth.login).send({
          email: admin.email,
          password: admin.password,
        })

        const response = await adminAgent.get(API_ROUTES.claims.list)

        expect(response.status).toBe(200)
        const parsed = listClaimsResponseSchema.safeParse(response.body)
        expect(parsed.success).toBe(true)
        if (!parsed.success) return

        expect(parsed.data.data).toHaveLength(1)
        expect(parsed.data.data[0]!.clientId).toBe(clientA.id)
      })

      it('returns empty list when no user_clients entry', async () => {
        const { agent: ownerAgent, user: owner } = await authenticatedAgent()
        const client = await createClient(owner.orgId)
        const affiliate = await createAffiliate(owner.orgId, client.id)
        await createTestClaim(ownerAgent, client.id, affiliate.id, affiliate.id)

        const { agent: adminAgent, user: admin } = await authenticatedAgent(
          ROLES.ADMIN,
        )
        await prisma.user.update({
          where: { id: admin.userId },
          data: { orgId: owner.orgId },
        })

        await adminAgent.post(API_ROUTES.auth.login).send({
          email: admin.email,
          password: admin.password,
        })

        const response = await adminAgent.get(API_ROUTES.claims.list)

        expect(response.status).toBe(200)
        const parsed = listClaimsResponseSchema.safeParse(response.body)
        expect(parsed.success).toBe(true)
        if (!parsed.success) return

        expect(parsed.data.data).toHaveLength(0)
        expect(parsed.data.meta.totalCount).toBe(0)
      })
    })

    describe('own scope (MEMBER)', () => {
      it('returns only claims for linked affiliate', async () => {
        const { agent: ownerAgent, user: owner } = await authenticatedAgent()
        const client = await createClient(owner.orgId)
        const affiliateLinked = await createAffiliate(owner.orgId, client.id)
        const affiliateOther = await createAffiliate(owner.orgId, client.id)
        await createTestClaim(
          ownerAgent,
          client.id,
          affiliateLinked.id,
          affiliateLinked.id,
          'Linked claim',
        )
        await createTestClaim(
          ownerAgent,
          client.id,
          affiliateOther.id,
          affiliateOther.id,
          'Other claim',
        )

        const { agent: memberAgent, user: member } = await authenticatedAgent(
          ROLES.MEMBER,
        )
        await prisma.user.update({
          where: { id: member.userId },
          data: { orgId: owner.orgId },
        })
        await prisma.affiliate.update({
          where: { id: affiliateLinked.id },
          data: { userId: member.userId },
        })

        await memberAgent.post(API_ROUTES.auth.login).send({
          email: member.email,
          password: member.password,
        })

        const response = await memberAgent.get(API_ROUTES.claims.list)

        expect(response.status).toBe(200)
        const parsed = listClaimsResponseSchema.safeParse(response.body)
        expect(parsed.success).toBe(true)
        if (!parsed.success) return

        expect(parsed.data.data).toHaveLength(1)
        expect(parsed.data.data[0]!.affiliateId).toBe(affiliateLinked.id)
      })

      it('returns empty list when no affiliate linked', async () => {
        const { agent: ownerAgent, user: owner } = await authenticatedAgent()
        const client = await createClient(owner.orgId)
        const affiliate = await createAffiliate(owner.orgId, client.id)
        await createTestClaim(ownerAgent, client.id, affiliate.id, affiliate.id)

        const { agent: memberAgent, user: member } = await authenticatedAgent(
          ROLES.MEMBER,
        )
        await prisma.user.update({
          where: { id: member.userId },
          data: { orgId: owner.orgId },
        })

        await memberAgent.post(API_ROUTES.auth.login).send({
          email: member.email,
          password: member.password,
        })

        const response = await memberAgent.get(API_ROUTES.claims.list)

        expect(response.status).toBe(200)
        const parsed = listClaimsResponseSchema.safeParse(response.body)
        expect(parsed.success).toBe(true)
        if (!parsed.success) return

        expect(parsed.data.data).toHaveLength(0)
        expect(parsed.data.meta.totalCount).toBe(0)
      })
    })
  })
})

describe('GET /claims/lookup/clients', () => {
  describe('authentication guard', () => {
    it('requires authentication', async () => {
      const response = await request(app).get(API_ROUTES.claims.lookupClients)

      expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
    })
  })

  describe('input validation', () => {
    it('rejects invalid page value', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .get(API_ROUTES.claims.lookupClients)
        .query({ page: 0 })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('successful lookup', () => {
    it('returns active org clients only, sorted by name, with pagination meta', async () => {
      const { agent, user } = await authenticatedAgent()
      await createClient(user.orgId, { name: 'Bravo Client' })
      await createClient(user.orgId, { name: 'Alpha Client' })
      await createClient(user.orgId, { name: 'Charlie Client' })
      await createClient(user.orgId, {
        name: 'Inactive Client',
        isActive: false,
      })

      const otherUser = await createVerifiedUser(app)
      await createClient(otherUser.orgId, { name: 'Other Org Client' })

      const response = await agent
        .get(API_ROUTES.claims.lookupClients)
        .query({ page: 1, limit: 2 })

      expect(response.status).toBe(200)
      const parsed = lookupClientsResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.data).toHaveLength(2)
      expect(parsed.data.data[0]!.name).toBe('Alpha Client')
      expect(parsed.data.data[1]!.name).toBe('Bravo Client')
      expect(parsed.data.meta.totalCount).toBe(3)
      expect(parsed.data.meta.totalPages).toBe(2)
    })

    it('filters by search on name', async () => {
      const { agent, user } = await authenticatedAgent()
      await createClient(user.orgId, { name: 'Northwind Health' })
      await createClient(user.orgId, { name: 'Acme Group' })

      const response = await agent
        .get(API_ROUTES.claims.lookupClients)
        .query({ search: 'north' })

      expect(response.status).toBe(200)
      const parsed = lookupClientsResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.data).toHaveLength(1)
      expect(parsed.data.data[0]!.name).toBe('Northwind Health')
    })
  })

  describe('permission scoping', () => {
    it('ADMIN sees only assigned clients', async () => {
      const { agent, user } = await authenticatedAgent(ROLES.ADMIN)
      const clientA = await createClient(user.orgId, {
        name: 'Assigned Client',
      })
      const clientB = await createClient(user.orgId, {
        name: 'Unassigned Client',
      })
      await createUserClient(user.userId, clientA.id)

      const response = await agent.get(API_ROUTES.claims.lookupClients)

      expect(response.status).toBe(200)
      const parsed = lookupClientsResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.data).toHaveLength(1)
      expect(parsed.data.data[0]!.id).toBe(clientA.id)
      expect(parsed.data.data[0]!.id).not.toBe(clientB.id)
    })

    it('MEMBER sees only clients linked through active own affiliates', async () => {
      const { agent, user } = await authenticatedAgent(ROLES.MEMBER)
      const clientA = await createClient(user.orgId, {
        name: 'Own Active Client',
      })
      const clientB = await createClient(user.orgId, {
        name: 'Unlinked Client',
      })

      // Link member to clientA through an active affiliate
      await createAffiliate(user.orgId, clientA.id, {
        userId: user.userId,
        isActive: true,
      })

      // clientB exists but has no affiliate linked to this user
      await createAffiliate(user.orgId, clientB.id)

      const response = await agent.get(API_ROUTES.claims.lookupClients)

      expect(response.status).toBe(200)
      const parsed = lookupClientsResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.data).toHaveLength(1)
      expect(parsed.data.data[0]!.id).toBe(clientA.id)
    })
  })
})

describe('GET /claims/lookup/clients/:clientId/affiliates', () => {
  function lookupClientAffiliatesUrl(clientId: string) {
    return API_ROUTES.claims.lookupClientAffiliates.replace(
      ':clientId',
      clientId,
    )
  }

  describe('authentication guard', () => {
    it('requires authentication', async () => {
      const response = await request(app).get(
        lookupClientAffiliatesUrl('a0000000-0000-4000-8000-000000000000'),
      )

      expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
    })
  })

  describe('input validation', () => {
    it('rejects invalid clientId param', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.get(lookupClientAffiliatesUrl('not-a-uuid'))

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('pre-validation', () => {
    it('returns 404 when client does not exist', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.get(
        lookupClientAffiliatesUrl('a0000000-0000-4000-8000-000000000001'),
      )

      expectError(
        response,
        404,
        ERROR_CODES.CLAIMS_CLIENT_NOT_FOUND,
        'Client not found',
      )
    })

    it('returns 422 when client is inactive', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId, { isActive: false })

      const response = await agent.get(lookupClientAffiliatesUrl(client.id))

      expectError(
        response,
        422,
        ERROR_CODES.CLAIMS_CLIENT_INACTIVE,
        'Client is inactive',
      )
    })
  })

  describe('permission scoping', () => {
    it('returns 403 for ADMIN without client assignment', async () => {
      const { agent, user } = await authenticatedAgent(ROLES.ADMIN)
      const client = await createClient(user.orgId)

      const response = await agent.get(lookupClientAffiliatesUrl(client.id))

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })

    it('returns only own affiliates for MEMBER scope', async () => {
      const { agent, user } = await authenticatedAgent(ROLES.MEMBER)
      const client = await createClient(user.orgId)
      const ownAffiliate = await createAffiliate(user.orgId, client.id, {
        userId: user.userId,
      })
      await createAffiliate(user.orgId, client.id)

      const response = await agent.get(lookupClientAffiliatesUrl(client.id))

      expect(response.status).toBe(200)
      const parsed = lookupClientAffiliatesResponseSchema.safeParse(
        response.body,
      )
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.data).toHaveLength(1)
      expect(parsed.data.data[0]!.id).toBe(ownAffiliate.id)
    })
  })

  describe('successful lookup', () => {
    it('returns active main affiliates only with sorting, search, and pagination', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)

      const alpha = await createAffiliate(user.orgId, client.id, {
        firstName: 'Alice',
        lastName: 'Alpha',
      })
      const zulu = await createAffiliate(user.orgId, client.id, {
        firstName: 'Zed',
        lastName: 'Zulu',
      })
      const dependent = await createAffiliate(user.orgId, client.id, {
        firstName: 'Dependent',
        lastName: 'Kid',
        primaryAffiliateId: alpha.id,
      })
      await createAffiliate(user.orgId, client.id, {
        firstName: 'Inactive',
        lastName: 'Person',
        isActive: false,
      })

      await prisma.affiliate.update({
        where: { id: alpha.id },
        data: { documentNumber: 'DOC-ALPHA' },
      })

      const response = await agent
        .get(lookupClientAffiliatesUrl(client.id))
        .query({ page: 1, limit: 10 })

      expect(response.status).toBe(200)
      const parsed = lookupClientAffiliatesResponseSchema.safeParse(
        response.body,
      )
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.meta.totalCount).toBe(2)
      expect(parsed.data.data).toHaveLength(2)
      expect(parsed.data.data[0]!.id).toBe(alpha.id)
      expect(parsed.data.data[1]!.id).toBe(zulu.id)
      expect(
        parsed.data.data.find((a) => a.id === dependent.id),
      ).toBeUndefined()

      const searchResponse = await agent
        .get(lookupClientAffiliatesUrl(client.id))
        .query({ search: 'doc-alpha' })

      expect(searchResponse.status).toBe(200)
      const searchParsed = lookupClientAffiliatesResponseSchema.safeParse(
        searchResponse.body,
      )
      expect(searchParsed.success).toBe(true)
      if (!searchParsed.success) return

      expect(searchParsed.data.data).toHaveLength(1)
      expect(searchParsed.data.data[0]!.id).toBe(alpha.id)
    })
  })
})

describe('GET /claims/lookup/affiliates/:affiliateId/patients', () => {
  function lookupAffiliatePatientsUrl(affiliateId: string) {
    return API_ROUTES.claims.lookupAffiliatePatients.replace(
      ':affiliateId',
      affiliateId,
    )
  }

  describe('authentication guard', () => {
    it('requires authentication', async () => {
      const response = await request(app).get(
        lookupAffiliatePatientsUrl('a0000000-0000-4000-8000-000000000000'),
      )

      expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
    })
  })

  describe('input validation', () => {
    it('rejects invalid affiliateId param', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.get(lookupAffiliatePatientsUrl('not-a-uuid'))

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('pre-validation', () => {
    it('returns 404 when affiliate does not exist', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.get(
        lookupAffiliatePatientsUrl('a0000000-0000-4000-8000-000000000001'),
      )

      expectError(
        response,
        404,
        ERROR_CODES.CLAIMS_AFFILIATE_NOT_FOUND,
        'Affiliate not found',
      )
    })

    it('returns 422 when affiliate is inactive', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id, {
        isActive: false,
      })

      const response = await agent.get(lookupAffiliatePatientsUrl(affiliate.id))

      expectError(
        response,
        422,
        ERROR_CODES.CLAIMS_AFFILIATE_INACTIVE,
        'Affiliate is inactive',
      )
    })
  })

  describe('permission scoping', () => {
    it('returns 403 for ADMIN without client assignment', async () => {
      const { agent, user } = await authenticatedAgent(ROLES.ADMIN)
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)

      const response = await agent.get(lookupAffiliatePatientsUrl(affiliate.id))

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })

    it('returns 403 for MEMBER when affiliate is not linked to user', async () => {
      const { agent, user } = await authenticatedAgent(ROLES.MEMBER)
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      await createAffiliate(user.orgId, client.id, { userId: user.userId })

      const response = await agent.get(lookupAffiliatePatientsUrl(affiliate.id))

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })
  })

  describe('successful lookup', () => {
    it('returns affiliate plus active dependents, with self first and no meta', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id, {
        firstName: 'Holder',
        lastName: 'Primary',
      })
      const dependentA = await createAffiliate(user.orgId, client.id, {
        firstName: 'Charlie',
        lastName: 'Zulu',
        primaryAffiliateId: affiliate.id,
      })
      const dependentB = await createAffiliate(user.orgId, client.id, {
        firstName: 'Ana',
        lastName: 'Alpha',
        primaryAffiliateId: affiliate.id,
      })
      await createAffiliate(user.orgId, client.id, {
        firstName: 'Inactive',
        lastName: 'Dependent',
        primaryAffiliateId: affiliate.id,
        isActive: false,
      })

      await prisma.affiliate.update({
        where: { id: dependentA.id },
        data: { relationship: 'CHILD' },
      })
      await prisma.affiliate.update({
        where: { id: dependentB.id },
        data: { relationship: 'SPOUSE' },
      })

      const response = await agent.get(lookupAffiliatePatientsUrl(affiliate.id))

      expect(response.status).toBe(200)
      const parsed = lookupAffiliatePatientsResponseSchema.safeParse(
        response.body,
      )
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(response.body.meta).toBeUndefined()
      expect(parsed.data.data).toHaveLength(3)
      expect(parsed.data.data[0]!.id).toBe(affiliate.id)
      expect(parsed.data.data[1]!.id).toBe(dependentB.id)
      expect(parsed.data.data[2]!.id).toBe(dependentA.id)
      expect(parsed.data.data[0]!.relationship).toBeNull()
      expect(parsed.data.data[1]!.relationship).toBe('SPOUSE')
      expect(parsed.data.data[2]!.relationship).toBe('CHILD')
    })
  })
})

describe('GET /claims/lookup/clients/:clientId/policies', () => {
  function lookupClientPoliciesUrl(clientId: string) {
    return API_ROUTES.claims.lookupClientPolicies.replace(':clientId', clientId)
  }

  describe('authentication guard', () => {
    it('requires authentication', async () => {
      const response = await request(app).get(
        lookupClientPoliciesUrl('a0000000-0000-4000-8000-000000000000'),
      )

      expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
    })
  })

  describe('input validation', () => {
    it('rejects invalid clientId param', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.get(lookupClientPoliciesUrl('not-a-uuid'))

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('pre-validation', () => {
    it('returns 404 when client does not exist', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.get(
        lookupClientPoliciesUrl('a0000000-0000-4000-8000-000000000001'),
      )

      expectError(
        response,
        404,
        ERROR_CODES.CLAIMS_CLIENT_NOT_FOUND,
        'Client not found',
      )
    })

    it('returns 422 when client is inactive', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId, { isActive: false })

      const response = await agent.get(lookupClientPoliciesUrl(client.id))

      expectError(
        response,
        422,
        ERROR_CODES.CLAIMS_CLIENT_INACTIVE,
        'Client is inactive',
      )
    })
  })

  describe('permission scoping', () => {
    it('returns 403 for ADMIN without client assignment', async () => {
      const { agent, user } = await authenticatedAgent(ROLES.ADMIN)
      const client = await createClient(user.orgId)

      const response = await agent.get(lookupClientPoliciesUrl(client.id))

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })
  })

  describe('successful lookup', () => {
    it('returns policies sorted by startDate desc with insurerName and pagination', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const insurer = await createInsurer(user.orgId, {
        name: 'Sorted Insurer',
      })

      const oldPolicy = await createPolicy(user.orgId, client.id, insurer.id, {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      })
      const midPolicy = await createPolicy(user.orgId, client.id, insurer.id, {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
      })
      const newPolicy = await createPolicy(user.orgId, client.id, insurer.id, {
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      })

      await prisma.policy.update({
        where: { id: oldPolicy.id },
        data: {
          policyNumber: 'POL-OLD-001',
          status: 'EXPIRED',
          type: 'HEALTH',
        },
      })
      await prisma.policy.update({
        where: { id: midPolicy.id },
        data: {
          policyNumber: 'POL-MID-001',
          status: 'SUSPENDED',
          type: 'LIFE',
        },
      })
      await prisma.policy.update({
        where: { id: newPolicy.id },
        data: {
          policyNumber: 'POL-NEW-001',
          status: 'ACTIVE',
          type: 'ACCIDENTS',
        },
      })

      const response = await agent
        .get(lookupClientPoliciesUrl(client.id))
        .query({ page: 1, limit: 10 })

      expect(response.status).toBe(200)
      const parsed = lookupClientPoliciesResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.meta.totalCount).toBe(3)
      expect(parsed.data.data).toHaveLength(3)
      expect(parsed.data.data[0]!.id).toBe(newPolicy.id)
      expect(parsed.data.data[1]!.id).toBe(midPolicy.id)
      expect(parsed.data.data[2]!.id).toBe(oldPolicy.id)
      expect(parsed.data.data[0]!.insurerName).toBe('Sorted Insurer')
      expect(parsed.data.data[0]!.status).toBe('ACTIVE')
      expect(parsed.data.data[1]!.status).toBe('SUSPENDED')
      expect(parsed.data.data[2]!.status).toBe('EXPIRED')
      expect(parsed.data.data[0]!.startDate).toBe('2026-01-01')
    })

    it('filters policies by policy number search', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const insurer = await createInsurer(user.orgId, {
        name: 'Search Insurer',
      })

      const policyA = await createPolicy(user.orgId, client.id, insurer.id)
      await prisma.policy.update({
        where: { id: policyA.id },
        data: { policyNumber: 'ABC-123-LOOKUP' },
      })
      const policyB = await createPolicy(user.orgId, client.id, insurer.id)
      await prisma.policy.update({
        where: { id: policyB.id },
        data: { policyNumber: 'ZZZ-999-OTHER' },
      })

      const response = await agent
        .get(lookupClientPoliciesUrl(client.id))
        .query({ search: 'abc-123' })

      expect(response.status).toBe(200)
      const parsed = lookupClientPoliciesResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.data).toHaveLength(1)
      expect(parsed.data.data[0]!.id).toBe(policyA.id)
    })
  })
})

describe('GET /claims/:id/history', () => {
  function historyUrl(id: string) {
    return API_ROUTES.claims.history.replace(':id', id)
  }

  async function createTestClaim(
    agent: request.Agent,
    clientId: string,
    affiliateId: string,
    patientId: string,
  ) {
    const response = await agent.post(API_ROUTES.claims.create).send({
      clientId,
      affiliateId,
      patientId,
      description: 'History claim',
    })
    expect(response.status).toBe(201)
    return response.body as { id: string }
  }

  describe('authentication guard', () => {
    it('requires authentication', async () => {
      const response = await request(app).get(
        historyUrl('a0000000-0000-4000-8000-000000000000'),
      )

      expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
    })
  })

  describe('input validation', () => {
    it('rejects invalid UUID param', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.get(historyUrl('not-a-uuid'))

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects invalid page value', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .get(historyUrl('a0000000-0000-4000-8000-000000000000'))
        .query({ page: 0 })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('claim lookup and scope', () => {
    it('returns 404 when claim does not exist', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.get(
        historyUrl('a0000000-0000-4000-8000-000000000001'),
      )

      expectError(
        response,
        404,
        ERROR_CODES.CLAIMS_CLAIM_NOT_FOUND,
        'Claim not found',
      )
    })

    it('returns 403 for ADMIN without client assignment', async () => {
      const { agent: ownerAgent, user: owner } = await authenticatedAgent()
      const client = await createClient(owner.orgId)
      const affiliate = await createAffiliate(owner.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        ownerAgent,
        client.id,
        affiliate.id,
        affiliate.id,
      )

      const { agent: adminAgent, user: admin } = await authenticatedAgent(
        ROLES.ADMIN,
      )
      await prisma.user.update({
        where: { id: admin.userId },
        data: { orgId: owner.orgId },
      })
      await adminAgent.post(API_ROUTES.auth.login).send({
        email: admin.email,
        password: admin.password,
      })

      const response = await adminAgent.get(historyUrl(claimId))

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })

    it('returns 403 for MEMBER when claim is not their affiliate', async () => {
      const { agent: ownerAgent, user: owner } = await authenticatedAgent()
      const client = await createClient(owner.orgId)
      const claimAffiliate = await createAffiliate(owner.orgId, client.id)

      const { id: claimId } = await createTestClaim(
        ownerAgent,
        client.id,
        claimAffiliate.id,
        claimAffiliate.id,
      )

      const { agent: memberAgent, user: member } = await authenticatedAgent(
        ROLES.MEMBER,
      )
      await prisma.user.update({
        where: { id: member.userId },
        data: { orgId: owner.orgId },
      })
      await createAffiliate(owner.orgId, client.id, {
        userId: member.userId,
      })
      await memberAgent.post(API_ROUTES.auth.login).send({
        email: member.email,
        password: member.password,
      })

      const response = await memberAgent.get(historyUrl(claimId))

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })
  })

  describe('successful history read', () => {
    it('returns paginated history sorted by createdAt desc', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )

      await prisma.claimHistory.create({
        data: {
          claimId,
          fromStatus: 'DRAFT',
          toStatus: 'IN_REVIEW',
          createdById: user.userId,
          createdAt: new Date('2030-01-01T00:00:00.000Z'),
        },
      })

      await prisma.claimHistory.create({
        data: {
          claimId,
          fromStatus: 'IN_REVIEW',
          toStatus: 'SUBMITTED',
          createdById: user.userId,
          createdAt: new Date('2030-01-02T00:00:00.000Z'),
        },
      })

      const response = await agent
        .get(historyUrl(claimId))
        .query({ page: 1, limit: 2 })

      expect(response.status).toBe(200)
      const parsed = claimHistoryResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.meta.totalCount).toBe(3)
      expect(parsed.data.meta.totalPages).toBe(2)
      expect(parsed.data.data).toHaveLength(2)
      expect(parsed.data.data[0]!.toStatus).toBe('SUBMITTED')
      expect(parsed.data.data[1]!.toStatus).toBe('IN_REVIEW')
      expect(parsed.data.data[0]!.createdByFirstName).toBe('Test')
      expect(parsed.data.data[0]!.createdByLastName).toBe('User')
    })
  })
})

describe('GET /claims/:id/timeline', () => {
  function timelineUrl(id: string) {
    return API_ROUTES.claims.timeline.replace(':id', id)
  }

  function claimUrl(id: string) {
    return API_ROUTES.claims.update.replace(':id', id)
  }

  function claimInvoicesUrl(id: string) {
    return API_ROUTES.claims.invoices.replace(':id', id)
  }

  function claimInvoiceByIdUrl(id: string, invoiceId: string) {
    return API_ROUTES.claims.invoiceById
      .replace(':id', id)
      .replace(':invoiceId', invoiceId)
  }

  async function createTestClaim(
    agent: request.Agent,
    clientId: string,
    affiliateId: string,
    patientId: string,
  ) {
    const response = await agent.post(API_ROUTES.claims.create).send({
      clientId,
      affiliateId,
      patientId,
      description: 'Timeline claim',
    })
    expect(response.status).toBe(201)
    return response.body as { id: string }
  }

  describe('authentication guard', () => {
    it('requires authentication', async () => {
      const response = await request(app).get(
        timelineUrl('a0000000-0000-4000-8000-000000000000'),
      )

      expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
    })
  })

  describe('input validation', () => {
    it('rejects invalid UUID param', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.get(timelineUrl('not-a-uuid'))

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects invalid page value', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .get(timelineUrl('a0000000-0000-4000-8000-000000000000'))
        .query({ page: 0 })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('claim lookup and scope', () => {
    it('returns 404 when claim does not exist', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.get(
        timelineUrl('a0000000-0000-4000-8000-000000000001'),
      )

      expectError(
        response,
        404,
        ERROR_CODES.CLAIMS_CLAIM_NOT_FOUND,
        'Claim not found',
      )
    })

    it('returns 403 for ADMIN without client assignment', async () => {
      const { agent: ownerAgent, user: owner } = await authenticatedAgent()
      const client = await createClient(owner.orgId)
      const affiliate = await createAffiliate(owner.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        ownerAgent,
        client.id,
        affiliate.id,
        affiliate.id,
      )

      const { agent: adminAgent, user: admin } = await authenticatedAgent(
        ROLES.ADMIN,
      )
      await prisma.user.update({
        where: { id: admin.userId },
        data: { orgId: owner.orgId },
      })
      await adminAgent.post(API_ROUTES.auth.login).send({
        email: admin.email,
        password: admin.password,
      })

      const response = await adminAgent.get(timelineUrl(claimId))

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })
  })

  describe('successful timeline read', () => {
    it('returns claim and invoice events for one claim only', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)

      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )

      const updateResponse = await agent
        .patch(claimUrl(claimId))
        .send({ description: 'Timeline updated description' })
      expect(updateResponse.status).toBe(200)

      const createInvoiceResponse = await agent
        .post(claimInvoicesUrl(claimId))
        .send({
          invoiceNumber: 'INV-TL-001',
          providerName: 'Timeline Provider',
          amountSubmitted: '100.00',
        })
      expect(createInvoiceResponse.status).toBe(201)
      const invoiceId = (createInvoiceResponse.body as { id: string }).id

      const patchInvoiceResponse = await agent
        .patch(claimInvoiceByIdUrl(claimId, invoiceId))
        .send({ amountSubmitted: '120.00' })
      expect(patchInvoiceResponse.status).toBe(200)

      const deleteInvoiceResponse = await agent.delete(
        claimInvoiceByIdUrl(claimId, invoiceId),
      )
      expect(deleteInvoiceResponse.status).toBe(200)

      const { id: otherClaimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )
      const otherUpdateResponse = await agent
        .patch(claimUrl(otherClaimId))
        .send({ description: 'Other claim update' })
      expect(otherUpdateResponse.status).toBe(200)

      await prisma.auditLog.create({
        data: {
          orgId: user.orgId,
          userId: null,
          action: 'claim.updated',
          resource: 'claim',
          resourceId: claimId,
          metadata: { changedFields: ['description'] },
          createdAt: new Date('2030-01-03T00:00:00.000Z'),
        },
      })

      const response = await agent
        .get(timelineUrl(claimId))
        .query({ page: 1, limit: 20 })

      expect(response.status).toBe(200)
      const parsed = claimTimelineResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      const actions = parsed.data.data.map((entry) => entry.action)
      expect(actions).toContain('claim.created')
      expect(actions).toContain('claim.updated')
      expect(actions).toContain('claim.invoice_created')
      expect(actions).toContain('claim.invoice_updated')
      expect(actions).toContain('claim.invoice_deleted')
      expect(
        parsed.data.data.every((entry) => entry.resourceId === claimId),
      ).toBe(true)

      const userEvent = parsed.data.data.find(
        (entry) => entry.userId === user.userId,
      )
      expect(userEvent).toBeDefined()
      expect(userEvent?.userFirstName).toBe('Test')
      expect(userEvent?.userLastName).toBe('User')

      const systemEvent = parsed.data.data.find(
        (entry) => entry.userId === null,
      )
      expect(systemEvent).toBeDefined()
      expect(systemEvent?.userFirstName).toBeNull()
      expect(systemEvent?.userLastName).toBeNull()
    })
  })
})

describe('GET /claims/:id/invoices', () => {
  function claimInvoicesUrl(id: string) {
    return API_ROUTES.claims.invoices.replace(':id', id)
  }

  async function createTestClaim(
    agent: request.Agent,
    clientId: string,
    affiliateId: string,
    patientId: string,
  ) {
    const response = await agent.post(API_ROUTES.claims.create).send({
      clientId,
      affiliateId,
      patientId,
      description: 'Invoices claim',
    })
    expect(response.status).toBe(201)
    return response.body as { id: string }
  }

  describe('authentication guard', () => {
    it('requires authentication', async () => {
      const response = await request(app).get(
        claimInvoicesUrl('a0000000-0000-4000-8000-000000000000'),
      )

      expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
    })
  })

  describe('input validation', () => {
    it('rejects invalid UUID param', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.get(claimInvoicesUrl('not-a-uuid'))

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('claim lookup and scope', () => {
    it('returns 404 when claim does not exist', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.get(
        claimInvoicesUrl('a0000000-0000-4000-8000-000000000001'),
      )

      expectError(
        response,
        404,
        ERROR_CODES.CLAIMS_CLAIM_NOT_FOUND,
        'Claim not found',
      )
    })

    it('returns 403 for ADMIN without client assignment', async () => {
      const { agent: ownerAgent, user: owner } = await authenticatedAgent()
      const client = await createClient(owner.orgId)
      const affiliate = await createAffiliate(owner.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        ownerAgent,
        client.id,
        affiliate.id,
        affiliate.id,
      )

      const { agent: adminAgent, user: admin } = await authenticatedAgent(
        ROLES.ADMIN,
      )
      await prisma.user.update({
        where: { id: admin.userId },
        data: { orgId: owner.orgId },
      })
      await adminAgent.post(API_ROUTES.auth.login).send({
        email: admin.email,
        password: admin.password,
      })

      const response = await adminAgent.get(claimInvoicesUrl(claimId))

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })
  })

  describe('successful invoice listing', () => {
    it('returns invoices sorted by createdAt desc with pagination', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )

      await prisma.claimInvoice.create({
        data: {
          claimId,
          invoiceNumber: 'INV-OLD-001',
          providerName: 'Provider Old',
          amountSubmitted: '10.50',
          createdById: user.userId,
          createdAt: new Date('2030-01-01T00:00:00.000Z'),
        },
      })

      const newerInvoice = await prisma.claimInvoice.create({
        data: {
          claimId,
          invoiceNumber: 'INV-NEW-001',
          providerName: 'Provider New',
          amountSubmitted: '20.75',
          createdById: user.userId,
          createdAt: new Date('2030-01-02T00:00:00.000Z'),
        },
      })

      const response = await agent
        .get(claimInvoicesUrl(claimId))
        .query({ page: 1, limit: 1 })

      expect(response.status).toBe(200)
      const parsed = claimInvoicesResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.meta.totalCount).toBe(2)
      expect(parsed.data.meta.totalPages).toBe(2)
      expect(parsed.data.data).toHaveLength(1)
      expect(parsed.data.data[0]!.id).toBe(newerInvoice.id)
      expect(parsed.data.data[0]!.amountSubmitted).toBe('20.75')
    })
  })
})

describe('GET /claims/:id/invoices/:invoiceId', () => {
  function claimInvoiceByIdUrl(id: string, invoiceId: string) {
    return API_ROUTES.claims.invoiceById
      .replace(':id', id)
      .replace(':invoiceId', invoiceId)
  }

  async function createTestClaim(
    agent: request.Agent,
    clientId: string,
    affiliateId: string,
    patientId: string,
  ) {
    const response = await agent.post(API_ROUTES.claims.create).send({
      clientId,
      affiliateId,
      patientId,
      description: 'Invoice by id claim',
    })
    expect(response.status).toBe(201)
    return response.body as { id: string }
  }

  describe('authentication guard', () => {
    it('requires authentication', async () => {
      const response = await request(app).get(
        claimInvoiceByIdUrl(
          'a0000000-0000-4000-8000-000000000000',
          'a0000000-0000-4000-8000-000000000000',
        ),
      )

      expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
    })
  })

  describe('input validation', () => {
    it('rejects invalid invoiceId param', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.get(
        claimInvoiceByIdUrl(
          'a0000000-0000-4000-8000-000000000000',
          'not-a-uuid',
        ),
      )

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('claim and invoice lookup', () => {
    it('returns 404 when claim does not exist', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.get(
        claimInvoiceByIdUrl(
          'a0000000-0000-4000-8000-000000000001',
          'a0000000-0000-4000-8000-000000000002',
        ),
      )

      expectError(
        response,
        404,
        ERROR_CODES.CLAIMS_CLAIM_NOT_FOUND,
        'Claim not found',
      )
    })

    it('returns 404 when invoice does not exist', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )

      const response = await agent.get(
        claimInvoiceByIdUrl(claimId, 'a0000000-0000-4000-8000-000000000002'),
      )

      expectError(
        response,
        404,
        ERROR_CODES.CLAIMS_INVOICE_NOT_FOUND,
        'Claim invoice not found',
      )
    })

    it('returns 403 for ADMIN without client assignment', async () => {
      const { agent: ownerAgent, user: owner } = await authenticatedAgent()
      const client = await createClient(owner.orgId)
      const affiliate = await createAffiliate(owner.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        ownerAgent,
        client.id,
        affiliate.id,
        affiliate.id,
      )
      const invoice = await prisma.claimInvoice.create({
        data: {
          claimId,
          invoiceNumber: 'INV-ADMIN-001',
          providerName: 'Provider',
          amountSubmitted: '50.00',
          createdById: owner.userId,
        },
      })

      const { agent: adminAgent, user: admin } = await authenticatedAgent(
        ROLES.ADMIN,
      )
      await prisma.user.update({
        where: { id: admin.userId },
        data: { orgId: owner.orgId },
      })
      await adminAgent.post(API_ROUTES.auth.login).send({
        email: admin.email,
        password: admin.password,
      })

      const response = await adminAgent.get(
        claimInvoiceByIdUrl(claimId, invoice.id),
      )

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })
  })

  describe('successful invoice retrieval', () => {
    it('returns one invoice and validates schema', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )

      const invoice = await prisma.claimInvoice.create({
        data: {
          claimId,
          invoiceNumber: 'INV-ONE-001',
          providerName: 'Provider One',
          amountSubmitted: '75.25',
          createdById: user.userId,
        },
      })

      const response = await agent.get(claimInvoiceByIdUrl(claimId, invoice.id))

      expect(response.status).toBe(200)
      const parsed = claimInvoiceResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.id).toBe(invoice.id)
      expect(parsed.data.claimId).toBe(claimId)
      expect(parsed.data.amountSubmitted).toBe('75.25')
    })
  })
})

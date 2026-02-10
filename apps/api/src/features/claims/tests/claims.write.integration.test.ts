import { describe, expect, it } from 'vitest'
import request from 'supertest'
import {
  API_ROUTES,
  ERROR_CODES,
  ROLES,
  claimInvoiceResponseSchema,
  createClaimResponseSchema,
  deleteClaimInvoiceResponseSchema,
  deleteClaimResponseSchema,
  getClaimByIdResponseSchema,
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

describe('POST /claims', () => {
  describe('authentication guard', () => {
    it('requires authentication', async () => {
      const response = await request(app).post(API_ROUTES.claims.create).send({
        clientId: 'a0000000-0000-4000-8000-000000000000',
        affiliateId: 'a0000000-0000-4000-8000-000000000000',
        patientId: 'a0000000-0000-4000-8000-000000000000',
        description: 'Test claim',
      })

      expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
    })
  })

  describe('input validation', () => {
    it('rejects empty body', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.post(API_ROUTES.claims.create).send({})

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects invalid UUIDs', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.post(API_ROUTES.claims.create).send({
        clientId: 'not-a-uuid',
        affiliateId: 'not-a-uuid',
        patientId: 'not-a-uuid',
        description: 'Test claim',
      })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects empty description', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.post(API_ROUTES.claims.create).send({
        clientId: 'a0000000-0000-4000-8000-000000000000',
        affiliateId: 'a0000000-0000-4000-8000-000000000000',
        patientId: 'a0000000-0000-4000-8000-000000000000',
        description: '',
      })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects description with null bytes', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.post(API_ROUTES.claims.create).send({
        clientId: 'a0000000-0000-4000-8000-000000000000',
        affiliateId: 'a0000000-0000-4000-8000-000000000000',
        patientId: 'a0000000-0000-4000-8000-000000000000',
        description: 'test\0',
      })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('client validation', () => {
    it('returns 404 when client does not exist', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.post(API_ROUTES.claims.create).send({
        clientId: 'a0000000-0000-4000-8000-000000000001',
        affiliateId: 'a0000000-0000-4000-8000-000000000002',
        patientId: 'a0000000-0000-4000-8000-000000000002',
        description: 'Test claim',
      })

      expectError(
        response,
        404,
        ERROR_CODES.CLAIMS_CLIENT_NOT_FOUND,
        'Client not found',
      )
    })

    it('returns 404 when client belongs to a different org', async () => {
      const { agent } = await authenticatedAgent()
      const otherUser = await createVerifiedUser(app)
      const otherClient = await createClient(otherUser.orgId)

      const response = await agent.post(API_ROUTES.claims.create).send({
        clientId: otherClient.id,
        affiliateId: 'a0000000-0000-4000-8000-000000000002',
        patientId: 'a0000000-0000-4000-8000-000000000002',
        description: 'Test claim',
      })

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

      const response = await agent.post(API_ROUTES.claims.create).send({
        clientId: client.id,
        affiliateId: 'a0000000-0000-4000-8000-000000000002',
        patientId: 'a0000000-0000-4000-8000-000000000002',
        description: 'Test claim',
      })

      expectError(
        response,
        422,
        ERROR_CODES.CLAIMS_CLIENT_INACTIVE,
        'Client is inactive',
      )
    })
  })

  describe('affiliate validation', () => {
    it('returns 404 when affiliate does not exist', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)

      const response = await agent.post(API_ROUTES.claims.create).send({
        clientId: client.id,
        affiliateId: 'a0000000-0000-4000-8000-000000000002',
        patientId: 'a0000000-0000-4000-8000-000000000002',
        description: 'Test claim',
      })

      expectError(
        response,
        404,
        ERROR_CODES.CLAIMS_AFFILIATE_NOT_FOUND,
        'Affiliate not found',
      )
    })

    it('returns 404 when affiliate belongs to a different org', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const otherUser = await createVerifiedUser(app)
      const otherClient = await createClient(otherUser.orgId)
      const otherAffiliate = await createAffiliate(
        otherUser.orgId,
        otherClient.id,
      )

      const response = await agent.post(API_ROUTES.claims.create).send({
        clientId: client.id,
        affiliateId: otherAffiliate.id,
        patientId: otherAffiliate.id,
        description: 'Test claim',
      })

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

      const response = await agent.post(API_ROUTES.claims.create).send({
        clientId: client.id,
        affiliateId: affiliate.id,
        patientId: affiliate.id,
        description: 'Test claim',
      })

      expectError(
        response,
        422,
        ERROR_CODES.CLAIMS_AFFILIATE_INACTIVE,
        'Affiliate is inactive',
      )
    })

    it('returns 422 when affiliate does not belong to the specified client', async () => {
      const { agent, user } = await authenticatedAgent()
      const client1 = await createClient(user.orgId)
      const client2 = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client2.id)

      const response = await agent.post(API_ROUTES.claims.create).send({
        clientId: client1.id,
        affiliateId: affiliate.id,
        patientId: affiliate.id,
        description: 'Test claim',
      })

      expectError(
        response,
        422,
        ERROR_CODES.CLAIMS_AFFILIATE_CLIENT_MISMATCH,
        'Affiliate does not belong to the specified client',
      )
    })
  })

  describe('patient validation', () => {
    it('returns 404 when patient does not exist', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)

      const response = await agent.post(API_ROUTES.claims.create).send({
        clientId: client.id,
        affiliateId: affiliate.id,
        patientId: 'a0000000-0000-4000-8000-000000000099',
        description: 'Test claim',
      })

      expectError(
        response,
        404,
        ERROR_CODES.CLAIMS_PATIENT_NOT_FOUND,
        'Patient not found',
      )
    })

    it('returns 422 when patient is inactive', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const dependent = await createAffiliate(user.orgId, client.id, {
        isActive: false,
        primaryAffiliateId: affiliate.id,
      })

      const response = await agent.post(API_ROUTES.claims.create).send({
        clientId: client.id,
        affiliateId: affiliate.id,
        patientId: dependent.id,
        description: 'Test claim',
      })

      expectError(
        response,
        422,
        ERROR_CODES.CLAIMS_PATIENT_INACTIVE,
        'Patient is inactive',
      )
    })

    it('returns 422 when patient is not the affiliate or their dependent', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const unrelatedAffiliate = await createAffiliate(user.orgId, client.id)

      const response = await agent.post(API_ROUTES.claims.create).send({
        clientId: client.id,
        affiliateId: affiliate.id,
        patientId: unrelatedAffiliate.id,
        description: 'Test claim',
      })

      expectError(
        response,
        422,
        ERROR_CODES.CLAIMS_PATIENT_NOT_DEPENDENT,
        'Patient is not the affiliate or one of their dependents',
      )
    })
  })

  describe('successful creation', () => {
    it('creates a claim when patient is the affiliate', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)

      const response = await agent.post(API_ROUTES.claims.create).send({
        clientId: client.id,
        affiliateId: affiliate.id,
        patientId: affiliate.id,
        description: 'Self claim description',
      })

      expect(response.status).toBe(201)

      const parsed = createClaimResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.status).toBe('DRAFT')
      expect(parsed.data.clientId).toBe(client.id)
      expect(parsed.data.affiliateId).toBe(affiliate.id)
      expect(parsed.data.patientId).toBe(affiliate.id)
      expect(parsed.data.description).toBe('Self claim description')
      expect(typeof parsed.data.claimNumber).toBe('number')

      // Verify DB state
      const dbClaim = await prisma.claim.findUnique({
        where: { id: parsed.data.id },
      })
      expect(dbClaim).not.toBeNull()
      expect(dbClaim!.status).toBe('DRAFT')
      expect(dbClaim!.policyId).toBeNull()
      expect(dbClaim!.careType).toBeNull()
      expect(dbClaim!.createdById).toBe(user.userId)

      // Verify ClaimHistory entry
      const history = await prisma.claimHistory.findFirst({
        where: { claimId: parsed.data.id },
      })
      expect(history).not.toBeNull()
      expect(history!.fromStatus).toBeNull()
      expect(history!.toStatus).toBe('DRAFT')
      expect(history!.createdById).toBe(user.userId)

      // Verify AuditLog entry
      const auditLog = await prisma.auditLog.findFirst({
        where: { userId: user.userId, action: 'claim.created' },
      })
      expect(auditLog).not.toBeNull()
      expect(auditLog!.orgId).toBe(user.orgId)
      expect(auditLog!.resource).toBe('claim')
      expect(auditLog!.resourceId).toBe(parsed.data.id)
    })

    it('creates a claim when patient is a dependent of the affiliate', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const dependent = await createAffiliate(user.orgId, client.id, {
        firstName: 'Dependent',
        lastName: 'Patient',
        primaryAffiliateId: affiliate.id,
      })

      const response = await agent.post(API_ROUTES.claims.create).send({
        clientId: client.id,
        affiliateId: affiliate.id,
        patientId: dependent.id,
        description: 'Dependent claim description',
      })

      expect(response.status).toBe(201)

      const parsed = createClaimResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.status).toBe('DRAFT')
      expect(parsed.data.affiliateId).toBe(affiliate.id)
      expect(parsed.data.patientId).toBe(dependent.id)
    })

    it('truncates long user-agent in audit log and still creates claim', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const longUserAgent = `ua-${'x'.repeat(1024)}`

      const response = await agent
        .post(API_ROUTES.claims.create)
        .set('User-Agent', longUserAgent)
        .send({
          clientId: client.id,
          affiliateId: affiliate.id,
          patientId: affiliate.id,
          description: 'Long user agent claim',
        })

      expect(response.status).toBe(201)
      const parsed = createClaimResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          userId: user.userId,
          action: 'claim.created',
          resourceId: parsed.data.id,
        },
      })
      expect(auditLog).not.toBeNull()
      expect(auditLog!.userAgent).toBe(longUserAgent.slice(0, 512))
      expect(auditLog!.userAgent?.length).toBe(512)
    })
  })

  describe('permission scoping', () => {
    it('rejects user with no claims:create permission', async () => {
      // Create a role with no permissions
      const noPermRole = await prisma.role.create({
        data: { name: 'NO_PERMS', description: 'No permissions' },
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

      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)

      const response = await agent.post(API_ROUTES.claims.create).send({
        clientId: client.id,
        affiliateId: affiliate.id,
        patientId: affiliate.id,
        description: 'Test claim',
      })

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })

    describe('all scope (OWNER)', () => {
      it('creates claim without user_clients entry', async () => {
        const { agent, user } = await authenticatedAgent()
        const client = await createClient(user.orgId)
        const affiliate = await createAffiliate(user.orgId, client.id)

        const response = await agent.post(API_ROUTES.claims.create).send({
          clientId: client.id,
          affiliateId: affiliate.id,
          patientId: affiliate.id,
          description: 'All-scope claim without user_clients',
        })

        expect(response.status).toBe(201)
      })
    })

    describe('client scope (ADMIN)', () => {
      it('returns 403 when user has no user_clients entry', async () => {
        const { agent, user } = await authenticatedAgent(ROLES.ADMIN)
        const client = await createClient(user.orgId)
        const affiliate = await createAffiliate(user.orgId, client.id)

        const response = await agent.post(API_ROUTES.claims.create).send({
          clientId: client.id,
          affiliateId: affiliate.id,
          patientId: affiliate.id,
          description: 'Test claim',
        })

        expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
      })

      it('creates claim when user has user_clients entry', async () => {
        const { agent, user } = await authenticatedAgent(ROLES.ADMIN)
        const client = await createClient(user.orgId)
        await createUserClient(user.userId, client.id)
        const affiliate = await createAffiliate(user.orgId, client.id)

        const response = await agent.post(API_ROUTES.claims.create).send({
          clientId: client.id,
          affiliateId: affiliate.id,
          patientId: affiliate.id,
          description: 'Admin client-scoped claim',
        })

        expect(response.status).toBe(201)
        const parsed = createClaimResponseSchema.safeParse(response.body)
        expect(parsed.success).toBe(true)
      })

      it('returns 403 for a different client than the one assigned', async () => {
        const { agent, user } = await authenticatedAgent(ROLES.ADMIN)
        const clientA = await createClient(user.orgId)
        const clientB = await createClient(user.orgId)
        await createUserClient(user.userId, clientA.id)
        const affiliate = await createAffiliate(user.orgId, clientB.id)

        const response = await agent.post(API_ROUTES.claims.create).send({
          clientId: clientB.id,
          affiliateId: affiliate.id,
          patientId: affiliate.id,
          description: 'Wrong client claim',
        })

        expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
      })
    })

    describe('own scope (MEMBER)', () => {
      it('returns 403 when affiliate userId does not match', async () => {
        const { agent, user } = await authenticatedAgent(ROLES.MEMBER)
        const client = await createClient(user.orgId)
        const affiliate = await createAffiliate(user.orgId, client.id)

        const response = await agent.post(API_ROUTES.claims.create).send({
          clientId: client.id,
          affiliateId: affiliate.id,
          patientId: affiliate.id,
          description: 'Test claim',
        })

        expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
      })

      it('creates claim when affiliate userId matches', async () => {
        const { agent, user } = await authenticatedAgent(ROLES.MEMBER)
        const client = await createClient(user.orgId)
        const affiliate = await createAffiliate(user.orgId, client.id, {
          userId: user.userId,
        })

        const response = await agent.post(API_ROUTES.claims.create).send({
          clientId: client.id,
          affiliateId: affiliate.id,
          patientId: affiliate.id,
          description: 'Own-scoped claim',
        })

        expect(response.status).toBe(201)
        const parsed = createClaimResponseSchema.safeParse(response.body)
        expect(parsed.success).toBe(true)
      })

      it('returns 403 for a different affiliate than the one linked', async () => {
        const { agent, user } = await authenticatedAgent(ROLES.MEMBER)
        const client = await createClient(user.orgId)
        await createAffiliate(user.orgId, client.id, {
          userId: user.userId,
        })
        const otherAffiliate = await createAffiliate(user.orgId, client.id)

        const response = await agent.post(API_ROUTES.claims.create).send({
          clientId: client.id,
          affiliateId: otherAffiliate.id,
          patientId: otherAffiliate.id,
          description: 'Wrong affiliate claim',
        })

        expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
      })
    })
  })
})

describe('PATCH /claims/:id', () => {
  function claimUrl(id: string) {
    return API_ROUTES.claims.update.replace(':id', id)
  }

  async function createTestClaim(
    agent: request.Agent,
    clientId: string,
    affiliateId: string,
    patientId: string,
    description = 'Test claim for PATCH',
  ) {
    const response = await agent.post(API_ROUTES.claims.create).send({
      clientId,
      affiliateId,
      patientId,
      description,
    })
    expect(response.status).toBe(201)
    return response.body as { id: string }
  }

  describe('authentication guard', () => {
    it('requires authentication', async () => {
      const response = await request(app)
        .patch(claimUrl('a0000000-0000-4000-8000-000000000000'))
        .send({ description: 'Updated' })

      expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
    })
  })

  describe('input validation', () => {
    it('rejects invalid UUID param', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .patch(claimUrl('not-a-uuid'))
        .send({ description: 'Updated' })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects empty body', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .patch(claimUrl('a0000000-0000-4000-8000-000000000000'))
        .send({})

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects invalid careType value', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .patch(claimUrl('a0000000-0000-4000-8000-000000000000'))
        .send({ careType: 'INVALID' })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects invalid decimal format for amounts', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .patch(claimUrl('a0000000-0000-4000-8000-000000000000'))
        .send({ amountSubmitted: 'abc' })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects description with null bytes', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .patch(claimUrl('a0000000-0000-4000-8000-000000000000'))
        .send({ description: 'test\0' })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('claim lookup', () => {
    it('returns 404 when claim does not exist', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .patch(claimUrl('a0000000-0000-4000-8000-000000000001'))
        .send({ description: 'Updated' })

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

      const response = await agent
        .patch(claimUrl(claimId))
        .send({ description: 'Updated' })

      expectError(
        response,
        404,
        ERROR_CODES.CLAIMS_CLAIM_NOT_FOUND,
        'Claim not found',
      )
    })
  })

  describe('policyId validation', () => {
    it('returns 404 when policyId does not exist', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )

      const response = await agent
        .patch(claimUrl(claimId))
        .send({ policyId: 'a0000000-0000-4000-8000-000000000099' })

      expectError(
        response,
        404,
        ERROR_CODES.CLAIMS_POLICY_NOT_FOUND,
        'Policy not found',
      )
    })

    it('returns 404 when policy belongs to a different org', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )

      const otherUser = await createVerifiedUser(app)
      const otherClient = await createClient(otherUser.orgId)
      const insurer = await createInsurer()
      const otherPolicy = await createPolicy(
        otherUser.orgId,
        otherClient.id,
        insurer.id,
      )

      const response = await agent
        .patch(claimUrl(claimId))
        .send({ policyId: otherPolicy.id })

      expectError(
        response,
        404,
        ERROR_CODES.CLAIMS_POLICY_NOT_FOUND,
        'Policy not found',
      )
    })

    it('returns 422 when policy belongs to a different client', async () => {
      const { agent, user } = await authenticatedAgent()
      const clientA = await createClient(user.orgId)
      const clientB = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, clientA.id)
      const { id: claimId } = await createTestClaim(
        agent,
        clientA.id,
        affiliate.id,
        affiliate.id,
      )

      const insurer = await createInsurer()
      const policyB = await createPolicy(user.orgId, clientB.id, insurer.id)

      const response = await agent
        .patch(claimUrl(claimId))
        .send({ policyId: policyB.id })

      expectError(
        response,
        422,
        ERROR_CODES.CLAIMS_POLICY_CLIENT_MISMATCH,
        'Policy does not belong to the claim client',
      )
    })

    it('updates policyId to a valid policy in the same client', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )

      const insurer = await createInsurer()
      const policy = await createPolicy(user.orgId, client.id, insurer.id)

      const response = await agent
        .patch(claimUrl(claimId))
        .send({ policyId: policy.id })

      expect(response.status).toBe(200)
      const parsed = getClaimByIdResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return
      expect(parsed.data.policyId).toBe(policy.id)
    })

    it('clears policyId with null (skips validation)', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )

      const response = await agent
        .patch(claimUrl(claimId))
        .send({ policyId: null })

      expect(response.status).toBe(200)
      const parsed = getClaimByIdResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return
      expect(parsed.data.policyId).toBeNull()
    })
  })

  describe('successful update', () => {
    it('updates description and returns full claim', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )

      const response = await agent
        .patch(claimUrl(claimId))
        .send({ description: 'Updated description' })

      expect(response.status).toBe(200)

      const parsed = getClaimByIdResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.id).toBe(claimId)
      expect(parsed.data.description).toBe('Updated description')
      expect(parsed.data.status).toBe('DRAFT')
    })

    it('updates careType to a valid value', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )

      const response = await agent
        .patch(claimUrl(claimId))
        .send({ careType: 'AMBULATORY' })

      expect(response.status).toBe(200)

      const parsed = getClaimByIdResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.careType).toBe('AMBULATORY')
    })

    it('sets policyId to null (nullable field)', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )

      const response = await agent
        .patch(claimUrl(claimId))
        .send({ policyId: null })

      expect(response.status).toBe(200)

      const parsed = getClaimByIdResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.policyId).toBeNull()
    })

    it('updates amount fields with decimal strings', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )

      // Move to IN_REVIEW so submission fields are editable
      await prisma.claim.update({
        where: { id: claimId },
        data: { status: 'IN_REVIEW' },
      })

      const response = await agent
        .patch(claimUrl(claimId))
        .send({ amountSubmitted: '1234.56' })

      expect(response.status).toBe(200)

      const parsed = getClaimByIdResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.amountSubmitted).toBe('1234.56')
    })

    it('sets updatedById to current user', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )

      const response = await agent
        .patch(claimUrl(claimId))
        .send({ description: 'Updated' })

      expect(response.status).toBe(200)

      const parsed = getClaimByIdResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.updatedById).toBe(user.userId)

      // Verify audit log
      const auditLog = await prisma.auditLog.findFirst({
        where: { userId: user.userId, action: 'claim.updated' },
      })
      expect(auditLog).not.toBeNull()
      expect(auditLog!.resource).toBe('claim')
      expect(auditLog!.resourceId).toBe(claimId)
      const metadata = auditLog!.metadata as {
        changedFields?: string[]
        claimStatus?: string
      } | null
      expect(metadata).not.toBeNull()
      expect(metadata?.changedFields).toEqual(
        expect.arrayContaining(['description']),
      )
      expect(metadata?.claimStatus).toBe('DRAFT')
    })
  })

  describe('state machine field enforcement', () => {
    it('allows core fields in DRAFT status', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )

      const response = await agent
        .patch(claimUrl(claimId))
        .send({ description: 'Updated', careType: 'HOSPITALARY' })

      expect(response.status).toBe(200)
      const parsed = getClaimByIdResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.description).toBe('Updated')
      expect(parsed.data.careType).toBe('HOSPITALARY')
    })

    it('rejects submission fields in DRAFT status', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )

      const response = await agent
        .patch(claimUrl(claimId))
        .send({ amountSubmitted: '100.00' })

      expectError(response, 422, ERROR_CODES.CLAIMS_FIELD_NOT_EDITABLE)
    })

    it('rejects settlement fields in DRAFT status', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )

      const response = await agent
        .patch(claimUrl(claimId))
        .send({ amountApproved: '500.00' })

      expectError(response, 422, ERROR_CODES.CLAIMS_FIELD_NOT_EDITABLE)
    })

    it('allows core + submission fields in IN_REVIEW status', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )

      await prisma.claim.update({
        where: { id: claimId },
        data: { status: 'IN_REVIEW' },
      })

      const response = await agent.patch(claimUrl(claimId)).send({
        description: 'Updated in review',
        amountSubmitted: '200.00',
        submittedDate: '2026-01-15',
      })

      expect(response.status).toBe(200)
      const parsed = getClaimByIdResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.description).toBe('Updated in review')
      expect(parsed.data.amountSubmitted).toBe('200')
      expect(parsed.data.submittedDate).toBe('2026-01-15')
    })

    it('rejects all fields in terminal status (SETTLED)', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )

      await prisma.claim.update({
        where: { id: claimId },
        data: { status: 'SETTLED' },
      })

      const response = await agent
        .patch(claimUrl(claimId))
        .send({ description: 'Should fail' })

      expectError(response, 422, ERROR_CODES.CLAIMS_FIELD_NOT_EDITABLE)
    })
  })

  describe('permission scoping', () => {
    it('rejects user with no claims:update permission', async () => {
      const noPermRole = await prisma.role.create({
        data: { name: 'NO_UPDATE_PERMS', description: 'No permissions' },
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

      const response = await agent
        .patch(claimUrl('a0000000-0000-4000-8000-000000000001'))
        .send({ description: 'Updated' })

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })

    describe('all scope (OWNER)', () => {
      it('updates any claim in org', async () => {
        const { agent, user } = await authenticatedAgent()
        const client = await createClient(user.orgId)
        const affiliate = await createAffiliate(user.orgId, client.id)
        const { id: claimId } = await createTestClaim(
          agent,
          client.id,
          affiliate.id,
          affiliate.id,
        )

        const response = await agent
          .patch(claimUrl(claimId))
          .send({ description: 'Owner updated' })

        expect(response.status).toBe(200)
      })
    })

    describe('client scope (ADMIN)', () => {
      it('returns 403 when no user_clients entry', async () => {
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

        const response = await agent
          .patch(claimUrl(claim.id))
          .send({ description: 'Updated' })

        expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
      })

      it('updates claim when user has user_clients entry', async () => {
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
            description: 'Admin client-scoped update',
            status: 'DRAFT',
            createdById: user.userId,
          },
        })

        const response = await agent
          .patch(claimUrl(claim.id))
          .send({ description: 'Admin updated' })

        expect(response.status).toBe(200)
        const parsed = getClaimByIdResponseSchema.safeParse(response.body)
        expect(parsed.success).toBe(true)
        if (!parsed.success) return
        expect(parsed.data.description).toBe('Admin updated')
      })

      it('returns 403 for claim under different client', async () => {
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
            description: 'Wrong client update',
            status: 'DRAFT',
            createdById: user.userId,
          },
        })

        const response = await agent
          .patch(claimUrl(claim.id))
          .send({ description: 'Updated' })

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
            description: 'Unlinked affiliate update',
            status: 'DRAFT',
            createdById: user.userId,
          },
        })

        const response = await agent
          .patch(claimUrl(claim.id))
          .send({ description: 'Updated' })

        expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
      })

      it('updates claim when affiliate userId matches', async () => {
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
            description: 'Own-scoped update',
            status: 'DRAFT',
            createdById: user.userId,
          },
        })

        const response = await agent
          .patch(claimUrl(claim.id))
          .send({ description: 'Member updated' })

        expect(response.status).toBe(200)
        const parsed = getClaimByIdResponseSchema.safeParse(response.body)
        expect(parsed.success).toBe(true)
        if (!parsed.success) return
        expect(parsed.data.description).toBe('Member updated')
      })

      it('returns 403 for claim under different affiliate', async () => {
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
            description: 'Wrong affiliate update',
            status: 'DRAFT',
            createdById: user.userId,
          },
        })

        const response = await agent
          .patch(claimUrl(claim.id))
          .send({ description: 'Updated' })

        expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
      })
    })
  })
})

describe('POST /claims/:id/transition', () => {
  function transitionUrl(id: string) {
    return API_ROUTES.claims.transition.replace(':id', id)
  }

  function claimUrl(id: string) {
    return API_ROUTES.claims.update.replace(':id', id)
  }

  async function createTestClaim(
    agent: request.Agent,
    clientId: string,
    affiliateId: string,
    patientId: string,
    description = 'Test claim for transition',
  ) {
    const response = await agent.post(API_ROUTES.claims.create).send({
      clientId,
      affiliateId,
      patientId,
      description,
    })
    expect(response.status).toBe(201)
    return response.body as { id: string }
  }

  async function fillCoreFields(
    agent: request.Agent,
    orgId: string,
    clientId: string,
    claimId: string,
  ) {
    const insurer = await createInsurer()
    const policy = await createPolicy(orgId, clientId, insurer.id)

    const response = await agent.patch(claimUrl(claimId)).send({
      policyId: policy.id,
      careType: 'AMBULATORY',
      diagnosis: 'Transition test diagnosis',
      incidentDate: '2026-01-10',
    })
    expect(response.status).toBe(200)
  }

  async function fillSubmissionFields(agent: request.Agent, claimId: string) {
    const response = await agent.patch(claimUrl(claimId)).send({
      amountSubmitted: '250.00',
      submittedDate: '2026-01-15',
    })
    expect(response.status).toBe(200)
  }

  async function fillSettlementFields(agent: request.Agent, claimId: string) {
    const response = await agent.patch(claimUrl(claimId)).send({
      amountApproved: '200.00',
      amountDenied: '25.00',
      amountUnprocessed: '25.00',
      deductibleApplied: '10.00',
      copayApplied: '5.00',
      settlementDate: '2026-01-20',
      settlementNumber: 'SET-2026-0001',
      settlementNotes: 'Settlement complete',
    })
    expect(response.status).toBe(200)
  }

  describe('authentication guard', () => {
    it('requires authentication', async () => {
      const response = await request(app)
        .post(transitionUrl('a0000000-0000-4000-8000-000000000000'))
        .send({ status: 'IN_REVIEW' })

      expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
    })
  })

  describe('input validation', () => {
    it('rejects invalid UUID param', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .post(transitionUrl('not-a-uuid'))
        .send({ status: 'IN_REVIEW' })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects missing status in body', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .post(transitionUrl('a0000000-0000-4000-8000-000000000000'))
        .send({})

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects invalid status value', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .post(transitionUrl('a0000000-0000-4000-8000-000000000000'))
        .send({ status: 'INVALID' })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects reason with null bytes', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .post(transitionUrl('a0000000-0000-4000-8000-000000000000'))
        .send({ status: 'IN_REVIEW', reason: 'bad\0reason' })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('claim lookup', () => {
    it('returns 404 when claim does not exist', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .post(transitionUrl('a0000000-0000-4000-8000-000000000001'))
        .send({ status: 'IN_REVIEW' })

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
      const response = await agent
        .post(transitionUrl(claimId))
        .send({ status: 'IN_REVIEW' })

      expectError(
        response,
        404,
        ERROR_CODES.CLAIMS_CLAIM_NOT_FOUND,
        'Claim not found',
      )
    })
  })

  describe('transition legality', () => {
    it('rejects invalid transition DRAFT to SUBMITTED', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )

      const response = await agent
        .post(transitionUrl(claimId))
        .send({ status: 'SUBMITTED' })

      expectError(response, 422, ERROR_CODES.CLAIMS_INVALID_TRANSITION)
    })

    it('rejects transition from terminal status CANCELLED', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )

      await prisma.claim.update({
        where: { id: claimId },
        data: { status: 'CANCELLED' },
      })

      const response = await agent
        .post(transitionUrl(claimId))
        .send({ status: 'DRAFT' })

      expectError(response, 422, ERROR_CODES.CLAIMS_INVALID_TRANSITION)
    })

    it('rejects transition from terminal status SETTLED', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )

      await prisma.claim.update({
        where: { id: claimId },
        data: { status: 'SETTLED' },
      })

      const response = await agent
        .post(transitionUrl(claimId))
        .send({ status: 'SUBMITTED' })

      expectError(response, 422, ERROR_CODES.CLAIMS_INVALID_TRANSITION)
    })
  })

  describe('reason requirements', () => {
    it('rejects DRAFT to CANCELLED without reason', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )

      const response = await agent
        .post(transitionUrl(claimId))
        .send({ status: 'CANCELLED' })

      expectError(response, 422, ERROR_CODES.CLAIMS_REASON_REQUIRED)
    })

    it('rejects IN_REVIEW to RETURNED without reason', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )
      await fillCoreFields(agent, user.orgId, client.id, claimId)

      const toInReview = await agent
        .post(transitionUrl(claimId))
        .send({ status: 'IN_REVIEW' })
      expect(toInReview.status).toBe(200)

      const response = await agent
        .post(transitionUrl(claimId))
        .send({ status: 'RETURNED' })

      expectError(response, 422, ERROR_CODES.CLAIMS_REASON_REQUIRED)
    })

    it('rejects SUBMITTED to PENDING_INFO without reason', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )
      await fillCoreFields(agent, user.orgId, client.id, claimId)

      const toInReview = await agent
        .post(transitionUrl(claimId))
        .send({ status: 'IN_REVIEW' })
      expect(toInReview.status).toBe(200)

      await fillSubmissionFields(agent, claimId)

      const toSubmitted = await agent
        .post(transitionUrl(claimId))
        .send({ status: 'SUBMITTED' })
      expect(toSubmitted.status).toBe(200)

      const response = await agent
        .post(transitionUrl(claimId))
        .send({ status: 'PENDING_INFO' })

      expectError(response, 422, ERROR_CODES.CLAIMS_REASON_REQUIRED)
    })

    it('accepts DRAFT to IN_REVIEW without reason', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )
      await fillCoreFields(agent, user.orgId, client.id, claimId)

      const response = await agent
        .post(transitionUrl(claimId))
        .send({ status: 'IN_REVIEW' })

      expect(response.status).toBe(200)
      const parsed = getClaimByIdResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return
      expect(parsed.data.status).toBe('IN_REVIEW')
    })
  })

  describe('invariant checks', () => {
    it('rejects DRAFT to IN_REVIEW when core fields are missing', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )

      const response = await agent
        .post(transitionUrl(claimId))
        .send({ status: 'IN_REVIEW' })

      expectError(response, 422, ERROR_CODES.CLAIMS_INVARIANT_VIOLATION)
      expect(response.body.error.message).toContain('policyId')
    })

    it('rejects IN_REVIEW to SUBMITTED when submission fields are missing', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )
      await fillCoreFields(agent, user.orgId, client.id, claimId)

      const toInReview = await agent
        .post(transitionUrl(claimId))
        .send({ status: 'IN_REVIEW' })
      expect(toInReview.status).toBe(200)

      const response = await agent
        .post(transitionUrl(claimId))
        .send({ status: 'SUBMITTED' })

      expectError(response, 422, ERROR_CODES.CLAIMS_INVARIANT_VIOLATION)
      expect(response.body.error.message).toContain('amountSubmitted')
      expect(response.body.error.message).toContain('submittedDate')
    })

    it('rejects SUBMITTED to SETTLED when settlement fields are missing', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )
      await fillCoreFields(agent, user.orgId, client.id, claimId)

      const toInReview = await agent
        .post(transitionUrl(claimId))
        .send({ status: 'IN_REVIEW' })
      expect(toInReview.status).toBe(200)

      await fillSubmissionFields(agent, claimId)

      const toSubmitted = await agent
        .post(transitionUrl(claimId))
        .send({ status: 'SUBMITTED' })
      expect(toSubmitted.status).toBe(200)

      const response = await agent
        .post(transitionUrl(claimId))
        .send({ status: 'SETTLED' })

      expectError(response, 422, ERROR_CODES.CLAIMS_INVARIANT_VIOLATION)
      expect(response.body.error.message).toContain('amountApproved')
    })
  })

  describe('successful transitions', () => {
    it('transitions DRAFT to CANCELLED and writes history and audit records', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )

      const response = await agent.post(transitionUrl(claimId)).send({
        status: 'CANCELLED',
        reason: 'Requested by member',
      })

      expect(response.status).toBe(200)
      const parsed = getClaimByIdResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return
      expect(parsed.data.status).toBe('CANCELLED')

      const history = await prisma.claimHistory.findFirst({
        where: {
          claimId,
          fromStatus: 'DRAFT',
          toStatus: 'CANCELLED',
        },
      })
      expect(history).not.toBeNull()
      expect(history!.reason).toBe('Requested by member')
      expect(history!.createdById).toBe(user.userId)

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          userId: user.userId,
          action: 'claim.transitioned',
          resourceId: claimId,
        },
      })
      expect(auditLog).not.toBeNull()
      const metadata = auditLog!.metadata as {
        fromStatus?: string
        toStatus?: string
        reason?: string | null
        notes?: string | null
      } | null
      expect(metadata).not.toBeNull()
      expect(metadata?.fromStatus).toBe('DRAFT')
      expect(metadata?.toStatus).toBe('CANCELLED')
      expect(metadata?.reason).toBe('Requested by member')
      expect(metadata?.notes).toBeNull()
    })

    it('transitions IN_REVIEW to SUBMITTED when core and submission fields are present', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )
      await fillCoreFields(agent, user.orgId, client.id, claimId)

      const toInReview = await agent
        .post(transitionUrl(claimId))
        .send({ status: 'IN_REVIEW' })
      expect(toInReview.status).toBe(200)

      await fillSubmissionFields(agent, claimId)

      const response = await agent
        .post(transitionUrl(claimId))
        .send({ status: 'SUBMITTED' })

      expect(response.status).toBe(200)
      const parsed = getClaimByIdResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return
      expect(parsed.data.status).toBe('SUBMITTED')
    })

    it('transitions through SUBMITTED to PENDING_INFO to SUBMITTED with required reasons', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )
      await fillCoreFields(agent, user.orgId, client.id, claimId)

      const toInReview = await agent
        .post(transitionUrl(claimId))
        .send({ status: 'IN_REVIEW' })
      expect(toInReview.status).toBe(200)

      await fillSubmissionFields(agent, claimId)

      const toSubmitted = await agent
        .post(transitionUrl(claimId))
        .send({ status: 'SUBMITTED' })
      expect(toSubmitted.status).toBe(200)

      const toPendingInfo = await agent.post(transitionUrl(claimId)).send({
        status: 'PENDING_INFO',
        reason: 'Need more documents',
      })
      expect(toPendingInfo.status).toBe(200)
      expect(toPendingInfo.body.status).toBe('PENDING_INFO')

      const backToSubmitted = await agent.post(transitionUrl(claimId)).send({
        status: 'SUBMITTED',
        reason: 'Documents received',
      })
      expect(backToSubmitted.status).toBe(200)
      expect(backToSubmitted.body.status).toBe('SUBMITTED')
    })

    it('transitions SUBMITTED to SETTLED when all editable fields are present', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )
      await fillCoreFields(agent, user.orgId, client.id, claimId)

      const toInReview = await agent
        .post(transitionUrl(claimId))
        .send({ status: 'IN_REVIEW' })
      expect(toInReview.status).toBe(200)

      await fillSubmissionFields(agent, claimId)

      const toSubmitted = await agent
        .post(transitionUrl(claimId))
        .send({ status: 'SUBMITTED' })
      expect(toSubmitted.status).toBe(200)

      await fillSettlementFields(agent, claimId)

      const response = await agent
        .post(transitionUrl(claimId))
        .send({ status: 'SETTLED' })

      expect(response.status).toBe(200)
      const parsed = getClaimByIdResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return
      expect(parsed.data.status).toBe('SETTLED')
    })
  })

  describe('permission scoping', () => {
    it('ADMIN can only transition claims for assigned clients', async () => {
      const { agent: ownerAgent, user: owner } = await authenticatedAgent()
      const clientA = await createClient(owner.orgId)
      const clientB = await createClient(owner.orgId)
      const affiliateB = await createAffiliate(owner.orgId, clientB.id)
      const { id: claimId } = await createTestClaim(
        ownerAgent,
        clientB.id,
        affiliateB.id,
        affiliateB.id,
      )

      const { agent: adminAgent, user: admin } = await authenticatedAgent(
        ROLES.ADMIN,
      )
      await prisma.user.update({
        where: { id: admin.userId },
        data: { orgId: owner.orgId },
      })
      await createUserClient(admin.userId, clientA.id)
      await adminAgent.post(API_ROUTES.auth.login).send({
        email: admin.email,
        password: admin.password,
      })

      const response = await adminAgent
        .post(transitionUrl(claimId))
        .send({ status: 'CANCELLED', reason: 'No access' })

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })

    it('MEMBER can only transition own claims', async () => {
      const { agent: ownerAgent, user: owner } = await authenticatedAgent()
      const client = await createClient(owner.orgId)
      const affiliate = await createAffiliate(owner.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        ownerAgent,
        client.id,
        affiliate.id,
        affiliate.id,
      )

      const { agent: memberAgent, user: member } = await authenticatedAgent(
        ROLES.MEMBER,
      )
      await prisma.user.update({
        where: { id: member.userId },
        data: { orgId: owner.orgId },
      })
      await createAffiliate(owner.orgId, client.id, { userId: member.userId })
      await memberAgent.post(API_ROUTES.auth.login).send({
        email: member.email,
        password: member.password,
      })

      const response = await memberAgent
        .post(transitionUrl(claimId))
        .send({ status: 'CANCELLED', reason: 'No ownership' })

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })

    it('OWNER can transition any claim in the org', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )

      const response = await agent
        .post(transitionUrl(claimId))
        .send({ status: 'CANCELLED', reason: 'Owner override' })

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('CANCELLED')
    })
  })

  describe('notes field', () => {
    it('stores optional notes on the history record', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )
      await fillCoreFields(agent, user.orgId, client.id, claimId)

      const response = await agent.post(transitionUrl(claimId)).send({
        status: 'IN_REVIEW',
        notes: 'Claim moved to review queue',
      })

      expect(response.status).toBe(200)

      const history = await prisma.claimHistory.findFirst({
        where: {
          claimId,
          fromStatus: 'DRAFT',
          toStatus: 'IN_REVIEW',
        },
      })
      expect(history).not.toBeNull()
      expect(history!.notes).toBe('Claim moved to review queue')
    })
  })
})

describe('DELETE /claims/:id', () => {
  function claimDeleteUrl(id: string) {
    return API_ROUTES.claims.delete.replace(':id', id)
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
      description: 'Delete claim test',
    })
    expect(response.status).toBe(201)
    return response.body as { id: string }
  }

  describe('authentication guard', () => {
    it('requires authentication', async () => {
      const response = await request(app).delete(
        claimDeleteUrl('a0000000-0000-4000-8000-000000000000'),
      )

      expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
    })
  })

  describe('input validation', () => {
    it('rejects invalid UUID param', async () => {
      const { agent } = await authenticatedAgent()
      const response = await agent.delete(claimDeleteUrl('not-a-uuid'))

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('claim lookup and scope', () => {
    it('returns 404 when claim does not exist', async () => {
      const { agent } = await authenticatedAgent()
      const response = await agent.delete(
        claimDeleteUrl('a0000000-0000-4000-8000-000000000001'),
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

      const response = await adminAgent.delete(claimDeleteUrl(claimId))

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })
  })

  describe('successful delete', () => {
    it('deletes claim, cascades invoices/history, and writes audit log', async () => {
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
          invoiceNumber: 'INV-DEL-001',
          providerName: 'Delete Provider',
          amountSubmitted: '80.00',
          createdById: user.userId,
        },
      })

      const response = await agent.delete(claimDeleteUrl(claimId))

      expect(response.status).toBe(200)
      const parsed = deleteClaimResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      const claim = await prisma.claim.findUnique({ where: { id: claimId } })
      expect(claim).toBeNull()

      const historyCount = await prisma.claimHistory.count({
        where: { claimId },
      })
      expect(historyCount).toBe(0)

      const invoiceCount = await prisma.claimInvoice.count({
        where: { claimId },
      })
      expect(invoiceCount).toBe(0)

      const auditEntry = await prisma.auditLog.findFirst({
        where: {
          userId: user.userId,
          action: 'claim.deleted',
          resource: 'claim',
          resourceId: claimId,
        },
      })
      expect(auditEntry).not.toBeNull()
    })
  })
})

describe('POST /claims/:id/invoices', () => {
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
      description: 'Create invoice claim',
    })
    expect(response.status).toBe(201)
    return response.body as { id: string }
  }

  describe('authentication guard', () => {
    it('requires authentication', async () => {
      const response = await request(app)
        .post(claimInvoicesUrl('a0000000-0000-4000-8000-000000000000'))
        .send({
          invoiceNumber: 'INV-001',
          providerName: 'Provider',
          amountSubmitted: '10.00',
        })

      expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
    })
  })

  describe('input validation', () => {
    it('rejects invalid UUID param', async () => {
      const { agent } = await authenticatedAgent()
      const response = await agent.post(claimInvoicesUrl('not-a-uuid')).send({
        invoiceNumber: 'INV-001',
        providerName: 'Provider',
        amountSubmitted: '10.00',
      })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects invalid body payload', async () => {
      const { agent } = await authenticatedAgent()
      const response = await agent
        .post(claimInvoicesUrl('a0000000-0000-4000-8000-000000000000'))
        .send({
          invoiceNumber: '',
          providerName: '',
          amountSubmitted: 'abc',
        })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('claim lookup and scope', () => {
    it('returns 404 when claim does not exist', async () => {
      const { agent } = await authenticatedAgent()
      const response = await agent
        .post(claimInvoicesUrl('a0000000-0000-4000-8000-000000000001'))
        .send({
          invoiceNumber: 'INV-404',
          providerName: 'Provider',
          amountSubmitted: '10.00',
        })

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

      const response = await adminAgent.post(claimInvoicesUrl(claimId)).send({
        invoiceNumber: 'INV-403',
        providerName: 'Provider',
        amountSubmitted: '20.00',
      })

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })
  })

  describe('successful creation', () => {
    it('creates invoice and writes audit log', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )

      const response = await agent.post(claimInvoicesUrl(claimId)).send({
        invoiceNumber: 'INV-NEW-001',
        providerName: 'Provider New',
        amountSubmitted: '145.35',
      })

      expect(response.status).toBe(201)
      const parsed = claimInvoiceResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.claimId).toBe(claimId)
      expect(parsed.data.invoiceNumber).toBe('INV-NEW-001')
      expect(parsed.data.amountSubmitted).toBe('145.35')

      const invoice = await prisma.claimInvoice.findUnique({
        where: { id: parsed.data.id },
      })
      expect(invoice).not.toBeNull()

      const auditEntry = await prisma.auditLog.findFirst({
        where: {
          userId: user.userId,
          action: 'claim.invoice_created',
          resource: 'claim',
          resourceId: claimId,
        },
      })
      expect(auditEntry).not.toBeNull()
    })

    it('allows invoice creation for terminal claim status', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )

      const toCancelled = await agent
        .post(API_ROUTES.claims.transition.replace(':id', claimId))
        .send({
          status: 'CANCELLED',
          reason: 'Terminal status test',
        })
      expect(toCancelled.status).toBe(200)

      const response = await agent.post(claimInvoicesUrl(claimId)).send({
        invoiceNumber: 'INV-CAN-001',
        providerName: 'Provider Terminal',
        amountSubmitted: '99.99',
      })

      expect(response.status).toBe(201)
    })
  })
})

describe('PATCH /claims/:id/invoices/:invoiceId', () => {
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
      description: 'Update invoice claim',
    })
    expect(response.status).toBe(201)
    return response.body as { id: string }
  }

  describe('authentication guard', () => {
    it('requires authentication', async () => {
      const response = await request(app)
        .patch(
          claimInvoiceByIdUrl(
            'a0000000-0000-4000-8000-000000000000',
            'a0000000-0000-4000-8000-000000000000',
          ),
        )
        .send({ providerName: 'Updated' })

      expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
    })
  })

  describe('input validation', () => {
    it('rejects empty body', async () => {
      const { agent } = await authenticatedAgent()
      const response = await agent
        .patch(
          claimInvoiceByIdUrl(
            'a0000000-0000-4000-8000-000000000000',
            'a0000000-0000-4000-8000-000000000000',
          ),
        )
        .send({})

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('claim and invoice lookup', () => {
    it('returns 404 when claim does not exist', async () => {
      const { agent } = await authenticatedAgent()
      const response = await agent
        .patch(
          claimInvoiceByIdUrl(
            'a0000000-0000-4000-8000-000000000001',
            'a0000000-0000-4000-8000-000000000002',
          ),
        )
        .send({ providerName: 'Updated Provider' })

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

      const response = await agent
        .patch(
          claimInvoiceByIdUrl(claimId, 'a0000000-0000-4000-8000-000000000002'),
        )
        .send({ providerName: 'Updated Provider' })

      expectError(
        response,
        404,
        ERROR_CODES.CLAIMS_INVOICE_NOT_FOUND,
        'Claim invoice not found',
      )
    })

    it('returns 404 when invoice belongs to a different claim', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimAId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )
      const { id: claimBId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )
      const invoice = await prisma.claimInvoice.create({
        data: {
          claimId: claimAId,
          invoiceNumber: 'INV-MISMATCH-UPD',
          providerName: 'Provider',
          amountSubmitted: '10.00',
          createdById: user.userId,
        },
      })

      const response = await agent
        .patch(claimInvoiceByIdUrl(claimBId, invoice.id))
        .send({ providerName: 'Should not update' })

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
          invoiceNumber: 'INV-UPD-001',
          providerName: 'Provider',
          amountSubmitted: '10.00',
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

      const response = await adminAgent
        .patch(claimInvoiceByIdUrl(claimId, invoice.id))
        .send({ providerName: 'Denied Update' })

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })
  })

  describe('successful update', () => {
    it('updates invoice and writes audit log', async () => {
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
          invoiceNumber: 'INV-UPD-OK',
          providerName: 'Before Update',
          amountSubmitted: '25.00',
          createdById: user.userId,
        },
      })

      const response = await agent
        .patch(claimInvoiceByIdUrl(claimId, invoice.id))
        .send({
          providerName: 'After Update',
          amountSubmitted: '30.50',
        })

      expect(response.status).toBe(200)
      const parsed = claimInvoiceResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.providerName).toBe('After Update')
      expect(parsed.data.amountSubmitted).toBe('30.5')

      const auditEntry = await prisma.auditLog.findFirst({
        where: {
          userId: user.userId,
          action: 'claim.invoice_updated',
          resource: 'claim',
          resourceId: claimId,
        },
      })
      expect(auditEntry).not.toBeNull()
    })
  })
})

describe('DELETE /claims/:id/invoices/:invoiceId', () => {
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
      description: 'Delete invoice claim',
    })
    expect(response.status).toBe(201)
    return response.body as { id: string }
  }

  describe('authentication guard', () => {
    it('requires authentication', async () => {
      const response = await request(app).delete(
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
      const response = await agent.delete(
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
      const response = await agent.delete(
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

      const response = await agent.delete(
        claimInvoiceByIdUrl(claimId, 'a0000000-0000-4000-8000-000000000002'),
      )

      expectError(
        response,
        404,
        ERROR_CODES.CLAIMS_INVOICE_NOT_FOUND,
        'Claim invoice not found',
      )
    })

    it('returns 404 when invoice belongs to a different claim', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const affiliate = await createAffiliate(user.orgId, client.id)
      const { id: claimAId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )
      const { id: claimBId } = await createTestClaim(
        agent,
        client.id,
        affiliate.id,
        affiliate.id,
      )
      const invoice = await prisma.claimInvoice.create({
        data: {
          claimId: claimAId,
          invoiceNumber: 'INV-MISMATCH-DEL',
          providerName: 'Provider',
          amountSubmitted: '10.00',
          createdById: user.userId,
        },
      })

      const response = await agent.delete(
        claimInvoiceByIdUrl(claimBId, invoice.id),
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
          invoiceNumber: 'INV-DEL-403',
          providerName: 'Provider',
          amountSubmitted: '70.00',
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

      const response = await adminAgent.delete(
        claimInvoiceByIdUrl(claimId, invoice.id),
      )

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })
  })

  describe('successful delete', () => {
    it('deletes invoice and writes audit log', async () => {
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
          invoiceNumber: 'INV-DEL-OK',
          providerName: 'Delete Me',
          amountSubmitted: '55.00',
          createdById: user.userId,
        },
      })

      const response = await agent.delete(
        claimInvoiceByIdUrl(claimId, invoice.id),
      )

      expect(response.status).toBe(200)
      const parsed = deleteClaimInvoiceResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      const deleted = await prisma.claimInvoice.findUnique({
        where: { id: invoice.id },
      })
      expect(deleted).toBeNull()

      const auditEntry = await prisma.auditLog.findFirst({
        where: {
          userId: user.userId,
          action: 'claim.invoice_deleted',
          resource: 'claim',
          resourceId: claimId,
        },
      })
      expect(auditEntry).not.toBeNull()
    })
  })
})

import { describe, expect, it } from 'vitest'
import request from 'supertest'
import {
  API_ROUTES,
  ERROR_CODES,
  ROLES,
  errorResponseSchema,
  createClaimResponseSchema,
  type ErrorCode,
} from '@friendly-system/shared'
import { createServer } from '../../server.js'
import { prisma } from '../../shared/db/prisma.js'
import {
  createVerifiedUser,
  createVerifiedUserWithRole,
} from '../../test/factories/auth.factory.js'
import {
  createClient,
  createAffiliate,
  createUserClient,
} from '../../test/factories/claims.factory.js'

const app = createServer()

function expectError(
  response: request.Response,
  statusCode: number,
  code: ErrorCode,
  message?: string,
) {
  expect(response.status).toBe(statusCode)
  const parsed = errorResponseSchema.safeParse(response.body)
  expect(parsed.success).toBe(true)
  if (!parsed.success) return
  expect(parsed.data.error.statusCode).toBe(statusCode)
  expect(parsed.data.error.code).toBe(code)
  if (message) {
    expect(parsed.data.error.message).toBe(message)
  }
}

async function authenticatedAgent(role?: string) {
  const user = role
    ? await createVerifiedUserWithRole(app, role)
    : await createVerifiedUser(app)
  const agent = request.agent(app)
  await agent.post(API_ROUTES.auth.login).send({
    email: user.email,
    password: user.password,
  })
  return { agent, user }
}

describe('POST /claims', () => {
  describe('authentication guard', () => {
    it('requires authentication', async () => {
      const response = await request(app)
        .post(API_ROUTES.claims.create)
        .send({
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

      const response = await agent
        .post(API_ROUTES.claims.create)
        .send({})

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects invalid UUIDs', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .post(API_ROUTES.claims.create)
        .send({
          clientId: 'not-a-uuid',
          affiliateId: 'not-a-uuid',
          patientId: 'not-a-uuid',
          description: 'Test claim',
        })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects empty description', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .post(API_ROUTES.claims.create)
        .send({
          clientId: 'a0000000-0000-4000-8000-000000000000',
          affiliateId: 'a0000000-0000-4000-8000-000000000000',
          patientId: 'a0000000-0000-4000-8000-000000000000',
          description: '',
        })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects description with null bytes', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .post(API_ROUTES.claims.create)
        .send({
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

      const response = await agent
        .post(API_ROUTES.claims.create)
        .send({
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

      const response = await agent
        .post(API_ROUTES.claims.create)
        .send({
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

      const response = await agent
        .post(API_ROUTES.claims.create)
        .send({
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

      const response = await agent
        .post(API_ROUTES.claims.create)
        .send({
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

      const response = await agent
        .post(API_ROUTES.claims.create)
        .send({
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

      const response = await agent
        .post(API_ROUTES.claims.create)
        .send({
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

      const response = await agent
        .post(API_ROUTES.claims.create)
        .send({
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

      const response = await agent
        .post(API_ROUTES.claims.create)
        .send({
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

      const response = await agent
        .post(API_ROUTES.claims.create)
        .send({
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

      const response = await agent
        .post(API_ROUTES.claims.create)
        .send({
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

      const response = await agent
        .post(API_ROUTES.claims.create)
        .send({
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

      const response = await agent
        .post(API_ROUTES.claims.create)
        .send({
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

      const response = await agent
        .post(API_ROUTES.claims.create)
        .send({
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

        const response = await agent
          .post(API_ROUTES.claims.create)
          .send({
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

        const response = await agent
          .post(API_ROUTES.claims.create)
          .send({
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

        const response = await agent
          .post(API_ROUTES.claims.create)
          .send({
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

        const response = await agent
          .post(API_ROUTES.claims.create)
          .send({
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

        const response = await agent
          .post(API_ROUTES.claims.create)
          .send({
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

        const response = await agent
          .post(API_ROUTES.claims.create)
          .send({
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

        const response = await agent
          .post(API_ROUTES.claims.create)
          .send({
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

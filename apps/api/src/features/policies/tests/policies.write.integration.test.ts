import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import request from 'supertest'
import {
  API_ROUTES,
  ERROR_CODES,
  ROLES,
  createPolicyResponseSchema,
  deletePolicyResponseSchema,
  getPolicyByIdResponseSchema,
} from '@friendly-system/shared'
import { prisma } from '../../../shared/db/prisma.js'
import { createVerifiedUser } from '../../../test/factories/auth.factory.js'
import {
  createAffiliate,
  createClient,
  createInsurer,
  createPolicy,
  createUserClient,
} from '../../../test/factories/policies.factory.js'
import {
  app,
  authenticatedAgent,
  expectError,
} from './policies.integration.shared.js'

function policyByIdUrl(id: string) {
  return API_ROUTES.policies.getById.replace(':id', id)
}

function policyTransitionUrl(id: string) {
  return API_ROUTES.policies.transition.replace(':id', id)
}

async function createPolicyViaApi(
  agent: request.Agent,
  clientId: string,
  insurerId: string,
  policyNumber?: string,
) {
  const response = await agent.post(API_ROUTES.policies.create).send({
    clientId,
    insurerId,
    policyNumber: policyNumber ?? `POL-${Date.now()}`,
    planName: 'Plan Corporativo',
    employeeClass: 'Administrativo',
    maxCoverage: '500000.00',
    deductible: '1200.00',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
  })
  expect(response.status).toBe(201)
  return response.body as { id: string; policyNumber: string }
}

describe('POST /policies', () => {
  describe('authentication and validation', () => {
    it('requires authentication', async () => {
      const response = await request(app)
        .post(API_ROUTES.policies.create)
        .send({})
      expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
    })

    it('rejects empty body', async () => {
      const { agent } = await authenticatedAgent()
      const response = await agent.post(API_ROUTES.policies.create).send({})

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects invalid UUID fields', async () => {
      const { agent } = await authenticatedAgent()
      const response = await agent.post(API_ROUTES.policies.create).send({
        clientId: 'not-a-uuid',
        insurerId: 'not-a-uuid',
        policyNumber: 'POL-BAD',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects invalid date range', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const insurer = await createInsurer(user.orgId)

      const response = await agent.post(API_ROUTES.policies.create).send({
        clientId: client.id,
        insurerId: insurer.id,
        policyNumber: 'POL-DATE-INVALID',
        startDate: '2026-12-31',
        endDate: '2026-01-01',
      })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('entity validation', () => {
    it('returns 404 when client does not exist', async () => {
      const { agent, user } = await authenticatedAgent()
      const insurer = await createInsurer(user.orgId)

      const response = await agent.post(API_ROUTES.policies.create).send({
        clientId: 'a0000000-0000-4000-8000-000000000001',
        insurerId: insurer.id,
        policyNumber: 'POL-CLIENT-404',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      })

      expectError(
        response,
        404,
        ERROR_CODES.POLICIES_CLIENT_NOT_FOUND,
        'Client not found',
      )
    })

    it('returns 404 when insurer does not exist', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)

      const response = await agent.post(API_ROUTES.policies.create).send({
        clientId: client.id,
        insurerId: 'a0000000-0000-4000-8000-000000000001',
        policyNumber: 'POL-INSURER-404',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      })

      expectError(
        response,
        404,
        ERROR_CODES.POLICIES_INSURER_NOT_FOUND,
        'Insurer not found',
      )
    })

    it('returns 422 when client or insurer is inactive', async () => {
      const { agent, user } = await authenticatedAgent()
      const inactiveClient = await createClient(user.orgId, { isActive: false })
      const inactiveInsurer = await createInsurer(user.orgId)
      await prisma.insurer.update({
        where: { id: inactiveInsurer.id },
        data: { isActive: false },
      })

      const clientInactive = await agent.post(API_ROUTES.policies.create).send({
        clientId: inactiveClient.id,
        insurerId: inactiveInsurer.id,
        policyNumber: 'POL-INACTIVE-CLIENT',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      })
      expectError(
        clientInactive,
        422,
        ERROR_CODES.POLICIES_CLIENT_INACTIVE,
        'Client is inactive',
      )

      const activeClient = await createClient(user.orgId)
      const insurerInactive = await agent
        .post(API_ROUTES.policies.create)
        .send({
          clientId: activeClient.id,
          insurerId: inactiveInsurer.id,
          policyNumber: 'POL-INACTIVE-INSURER',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
        })
      expectError(
        insurerInactive,
        422,
        ERROR_CODES.POLICIES_INSURER_INACTIVE,
        'Insurer is inactive',
      )
    })
  })

  describe('permission scoping', () => {
    it('rejects users with no policies:create permission', async () => {
      const noPermRole = await prisma.role.create({
        data: { name: 'NO_POLICIES_CREATE', description: 'No policies create' },
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

      const response = await agent.post(API_ROUTES.policies.create).send({
        clientId: randomUUID(),
        insurerId: randomUUID(),
        policyNumber: 'POL-NO-PERM',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      })

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })

    it('ADMIN can create only for assigned clients', async () => {
      const { agent, user } = await authenticatedAgent(ROLES.ADMIN)
      const client = await createClient(user.orgId)
      const insurer = await createInsurer(user.orgId)

      const denied = await agent.post(API_ROUTES.policies.create).send({
        clientId: client.id,
        insurerId: insurer.id,
        policyNumber: 'POL-ADMIN-SCOPE-001',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      })
      expectError(denied, 403, ERROR_CODES.PERMISSION_DENIED)

      await createUserClient(user.userId, client.id)
      const allowed = await agent.post(API_ROUTES.policies.create).send({
        clientId: client.id,
        insurerId: insurer.id,
        policyNumber: 'POL-ADMIN-SCOPE-002',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      })
      expect(allowed.status).toBe(201)
    })

    it('MEMBER can create only for linked affiliate clients', async () => {
      const { agent, user } = await authenticatedAgent(ROLES.MEMBER)
      const client = await createClient(user.orgId)
      const insurer = await createInsurer(user.orgId)

      const denied = await agent.post(API_ROUTES.policies.create).send({
        clientId: client.id,
        insurerId: insurer.id,
        policyNumber: 'POL-MEMBER-SCOPE-001',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      })
      expectError(denied, 403, ERROR_CODES.PERMISSION_DENIED)

      await createAffiliate(user.orgId, client.id, { userId: user.userId })
      const allowed = await agent.post(API_ROUTES.policies.create).send({
        clientId: client.id,
        insurerId: insurer.id,
        policyNumber: 'POL-MEMBER-SCOPE-002',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      })
      expect(allowed.status).toBe(201)
    })
  })

  describe('successful creation', () => {
    it('creates policy with PENDING status and writes initial history + audit', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const insurer = await createInsurer(user.orgId)

      const response = await agent.post(API_ROUTES.policies.create).send({
        clientId: client.id,
        insurerId: insurer.id,
        policyNumber: 'POL-CREATE-001',
        type: 'HEALTH',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      })

      expect(response.status).toBe(201)
      const parsed = createPolicyResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.status).toBe('PENDING')
      expect(parsed.data.clientId).toBe(client.id)
      expect(parsed.data.insurerId).toBe(insurer.id)

      const history = await prisma.policyHistory.findMany({
        where: { policyId: parsed.data.id },
        orderBy: { createdAt: 'asc' },
      })
      expect(history).toHaveLength(1)
      expect(history[0]?.fromStatus).toBeNull()
      expect(history[0]?.toStatus).toBe('PENDING')

      const audit = await prisma.auditLog.findFirst({
        where: {
          orgId: user.orgId,
          userId: user.userId,
          resource: 'policy',
          resourceId: parsed.data.id,
          action: 'policy.created',
        },
      })
      expect(audit).not.toBeNull()
    })

    it('maps unique policy number conflicts by insurer', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const insurer = await createInsurer(user.orgId)

      await createPolicyViaApi(agent, client.id, insurer.id, 'POL-UNIQUE-001')

      const response = await agent.post(API_ROUTES.policies.create).send({
        clientId: client.id,
        insurerId: insurer.id,
        policyNumber: 'POL-UNIQUE-001',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      })

      expectError(
        response,
        409,
        ERROR_CODES.POLICIES_NUMBER_UNAVAILABLE,
        'Policy number unavailable for insurer',
      )
    })
  })
})

describe('PATCH /policies/:id', () => {
  describe('authentication and validation', () => {
    it('requires authentication', async () => {
      const response = await request(app)
        .patch(policyByIdUrl(randomUUID()))
        .send({
          policyNumber: 'POL-PATCH-001',
        })
      expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
    })

    it('rejects invalid UUID param', async () => {
      const { agent } = await authenticatedAgent()
      const response = await agent.patch(policyByIdUrl('not-a-uuid')).send({
        policyNumber: 'POL-PATCH-001',
      })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects empty payload', async () => {
      const { agent } = await authenticatedAgent()
      const response = await agent.patch(policyByIdUrl(randomUUID())).send({})

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects invalid decimal format', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const insurer = await createInsurer(user.orgId)
      const created = await createPolicyViaApi(agent, client.id, insurer.id)

      const response = await agent.patch(policyByIdUrl(created.id)).send({
        tPremium: '123.456',
      })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('not found and scope checks', () => {
    it('returns 404 when policy does not exist', async () => {
      const { agent } = await authenticatedAgent()
      const response = await agent.patch(policyByIdUrl(randomUUID())).send({
        policyNumber: 'POL-PATCH-404',
      })

      expectError(
        response,
        404,
        ERROR_CODES.POLICIES_POLICY_NOT_FOUND,
        'Policy not found',
      )
    })

    it('returns 404 when policy belongs to a different org', async () => {
      const { agent: otherAgent, user: otherUser } = await authenticatedAgent()
      const otherClient = await createClient(otherUser.orgId)
      const otherInsurer = await createInsurer(otherUser.orgId)
      const otherPolicy = await createPolicyViaApi(
        otherAgent,
        otherClient.id,
        otherInsurer.id,
      )

      const { agent } = await authenticatedAgent()
      const response = await agent.patch(policyByIdUrl(otherPolicy.id)).send({
        policyNumber: 'POL-PATCH-XORG',
      })

      expectError(
        response,
        404,
        ERROR_CODES.POLICIES_POLICY_NOT_FOUND,
        'Policy not found',
      )
    })

    it('returns 403 for ADMIN without client assignment', async () => {
      const { agent, user } = await authenticatedAgent(ROLES.ADMIN)
      const client = await createClient(user.orgId)
      const insurer = await createInsurer(user.orgId)
      const policy = await createPolicy(user.orgId, client.id, insurer.id)

      const response = await agent.patch(policyByIdUrl(policy.id)).send({
        policyNumber: 'POL-ADMIN-DENY',
      })

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })

    it('returns 403 for MEMBER without linked affiliate', async () => {
      const { agent, user } = await authenticatedAgent(ROLES.MEMBER)
      const client = await createClient(user.orgId)
      const insurer = await createInsurer(user.orgId)
      const policy = await createPolicy(user.orgId, client.id, insurer.id)

      const response = await agent.patch(policyByIdUrl(policy.id)).send({
        policyNumber: 'POL-MEMBER-DENY',
      })

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })
  })

  describe('business rules', () => {
    it('updates editable fields in PENDING and writes audit log', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const insurer = await createInsurer(user.orgId)
      const created = await createPolicyViaApi(
        agent,
        client.id,
        insurer.id,
        'POL-PATCH-001',
      )

      const response = await agent.patch(policyByIdUrl(created.id)).send({
        tPremium: '123.45',
        benefitsCostPerPerson: '77.10',
        planName: 'Plan Plus',
        employeeClass: 'Ejecutivo',
        maxCoverage: '850000.00',
        deductible: '900.00',
      })
      expect(response.status).toBe(200)

      const parsed = getPolicyByIdResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return
      expect(parsed.data.tPremium).toBe('123.45')
      expect(parsed.data.benefitsCostPerPerson).toBe('77.1')
      expect(parsed.data.planName).toBe('Plan Plus')
      expect(parsed.data.employeeClass).toBe('Ejecutivo')
      expect(parsed.data.maxCoverage).toBe('850000')
      expect(parsed.data.deductible).toBe('900')

      const audit = await prisma.auditLog.findFirst({
        where: {
          orgId: user.orgId,
          userId: user.userId,
          resource: 'policy',
          resourceId: created.id,
          action: 'policy.updated',
        },
      })
      expect(audit).not.toBeNull()
    })

    it('validates patched client and insurer existence/active checks', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const insurer = await createInsurer(user.orgId)
      const created = await createPolicyViaApi(agent, client.id, insurer.id)

      const missingClient = await agent.patch(policyByIdUrl(created.id)).send({
        clientId: randomUUID(),
      })
      expectError(
        missingClient,
        404,
        ERROR_CODES.POLICIES_CLIENT_NOT_FOUND,
        'Client not found',
      )

      const inactiveClient = await createClient(user.orgId, { isActive: false })
      const clientInactive = await agent.patch(policyByIdUrl(created.id)).send({
        clientId: inactiveClient.id,
      })
      expectError(
        clientInactive,
        422,
        ERROR_CODES.POLICIES_CLIENT_INACTIVE,
        'Client is inactive',
      )

      const missingInsurer = await agent.patch(policyByIdUrl(created.id)).send({
        insurerId: randomUUID(),
      })
      expectError(
        missingInsurer,
        404,
        ERROR_CODES.POLICIES_INSURER_NOT_FOUND,
        'Insurer not found',
      )

      const inactiveInsurer = await createInsurer(user.orgId)
      await prisma.insurer.update({
        where: { id: inactiveInsurer.id },
        data: { isActive: false },
      })
      const insurerInactive = await agent
        .patch(policyByIdUrl(created.id))
        .send({
          insurerId: inactiveInsurer.id,
        })
      expectError(
        insurerInactive,
        422,
        ERROR_CODES.POLICIES_INSURER_INACTIVE,
        'Insurer is inactive',
      )
    })

    it('enforces date-range and status editability constraints', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const insurer = await createInsurer(user.orgId)
      const created = await createPolicyViaApi(agent, client.id, insurer.id)

      const invalidRange = await agent.patch(policyByIdUrl(created.id)).send({
        startDate: '2027-01-01',
      })
      expectError(
        invalidRange,
        422,
        ERROR_CODES.VALIDATION_ERROR,
        'startDate must not be after endDate',
      )

      await prisma.policy.update({
        where: { id: created.id },
        data: { status: 'EXPIRED' },
      })

      const nonEditable = await agent.patch(policyByIdUrl(created.id)).send({
        endDate: '2027-12-31',
      })
      expectError(
        nonEditable,
        422,
        ERROR_CODES.POLICIES_FIELD_NOT_EDITABLE,
        'Fields not editable in EXPIRED status: endDate',
      )
    })

    it('maps unique policy number conflicts by insurer', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const insurer = await createInsurer(user.orgId)
      const first = await createPolicyViaApi(
        agent,
        client.id,
        insurer.id,
        'POL-UNI-1',
      )
      await createPolicyViaApi(agent, client.id, insurer.id, 'POL-UNI-2')

      const conflict = await agent.patch(policyByIdUrl(first.id)).send({
        policyNumber: 'POL-UNI-2',
      })

      expectError(
        conflict,
        409,
        ERROR_CODES.POLICIES_NUMBER_UNAVAILABLE,
        'Policy number unavailable for insurer',
      )
    })

    it('allows only financial additions in ACTIVE status', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const insurer = await createInsurer(user.orgId)
      const created = await createPolicyViaApi(agent, client.id, insurer.id)

      const activate = await agent
        .post(policyTransitionUrl(created.id))
        .send({ status: 'ACTIVE' })
      expect(activate.status).toBe(200)

      const nonEditable = await agent.patch(policyByIdUrl(created.id)).send({
        planName: 'Plan Bloqueado',
      })
      expectError(
        nonEditable,
        422,
        ERROR_CODES.POLICIES_FIELD_NOT_EDITABLE,
        'Fields not editable in ACTIVE status: planName',
      )

      const editable = await agent.patch(policyByIdUrl(created.id)).send({
        maxCoverage: '990000.00',
        deductible: '700.00',
      })
      expect(editable.status).toBe(200)
      const parsed = getPolicyByIdResponseSchema.safeParse(editable.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return
      expect(parsed.data.maxCoverage).toBe('990000')
      expect(parsed.data.deductible).toBe('700')
    })
  })
})

describe('POST /policies/:id/transition', () => {
  describe('authentication and validation', () => {
    it('requires authentication', async () => {
      const response = await request(app)
        .post(policyTransitionUrl(randomUUID()))
        .send({ status: 'ACTIVE' })
      expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
    })

    it('rejects invalid UUID param', async () => {
      const { agent } = await authenticatedAgent()
      const response = await agent
        .post(policyTransitionUrl('not-a-uuid'))
        .send({ status: 'ACTIVE' })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects missing or invalid status body', async () => {
      const { agent } = await authenticatedAgent()
      const policyId = randomUUID()

      const missing = await agent.post(policyTransitionUrl(policyId)).send({})
      expectError(missing, 400, ERROR_CODES.VALIDATION_ERROR)

      const invalid = await agent
        .post(policyTransitionUrl(policyId))
        .send({ status: 'INVALID' })
      expectError(invalid, 400, ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('not found and scope checks', () => {
    it('returns 404 when policy does not exist', async () => {
      const { agent } = await authenticatedAgent()
      const response = await agent
        .post(policyTransitionUrl(randomUUID()))
        .send({ status: 'ACTIVE' })

      expectError(
        response,
        404,
        ERROR_CODES.POLICIES_POLICY_NOT_FOUND,
        'Policy not found',
      )
    })

    it('returns 403 for ADMIN without client assignment', async () => {
      const { agent, user } = await authenticatedAgent(ROLES.ADMIN)
      const client = await createClient(user.orgId)
      const insurer = await createInsurer(user.orgId)
      const policy = await createPolicy(user.orgId, client.id, insurer.id)

      const response = await agent
        .post(policyTransitionUrl(policy.id))
        .send({ status: 'ACTIVE' })

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })

    it('returns 403 for MEMBER without linked affiliate', async () => {
      const { agent, user } = await authenticatedAgent(ROLES.MEMBER)
      const client = await createClient(user.orgId)
      const insurer = await createInsurer(user.orgId)
      const policy = await createPolicy(user.orgId, client.id, insurer.id)

      const response = await agent
        .post(policyTransitionUrl(policy.id))
        .send({ status: 'ACTIVE' })

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })
  })

  describe('transition rules and side-effects', () => {
    it('rejects invalid transitions', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const insurer = await createInsurer(user.orgId)
      const created = await createPolicyViaApi(agent, client.id, insurer.id)

      const response = await agent
        .post(policyTransitionUrl(created.id))
        .send({ status: 'SUSPENDED' })

      expectError(
        response,
        422,
        ERROR_CODES.POLICIES_INVALID_TRANSITION,
        'Cannot transition from PENDING to SUSPENDED',
      )
    })

    it('requires reason for configured transitions', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const insurer = await createInsurer(user.orgId)
      const created = await createPolicyViaApi(agent, client.id, insurer.id)

      const toActive = await agent
        .post(policyTransitionUrl(created.id))
        .send({ status: 'ACTIVE' })
      expect(toActive.status).toBe(200)

      const missingReason = await agent
        .post(policyTransitionUrl(created.id))
        .send({ status: 'SUSPENDED' })
      expectError(
        missingReason,
        422,
        ERROR_CODES.POLICIES_REASON_REQUIRED,
        'Reason is required for this transition',
      )
    })

    it('enforces required invariants before transitioning to ACTIVE', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const insurer = await createInsurer(user.orgId)

      const created = await agent.post(API_ROUTES.policies.create).send({
        clientId: client.id,
        insurerId: insurer.id,
        policyNumber: 'POL-INVARIANT-001',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      })
      expect(created.status).toBe(201)

      const response = await agent
        .post(policyTransitionUrl(created.body.id))
        .send({ status: 'ACTIVE' })

      expectError(response, 422, ERROR_CODES.POLICIES_INVARIANT_VIOLATION)
      expect(response.body.error.message).toContain('planName')
      expect(response.body.error.message).toContain('employeeClass')
      expect(response.body.error.message).toContain('maxCoverage')
      expect(response.body.error.message).toContain('deductible')
    })

    it('transitions policy and writes history + audit records', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const insurer = await createInsurer(user.orgId)
      const created = await createPolicyViaApi(agent, client.id, insurer.id)

      const response = await agent.post(policyTransitionUrl(created.id)).send({
        status: 'ACTIVE',
        notes: 'Policy approved',
      })

      expect(response.status).toBe(200)
      const parsed = getPolicyByIdResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return
      expect(parsed.data.status).toBe('ACTIVE')

      const history = await prisma.policyHistory.findMany({
        where: { policyId: created.id },
        orderBy: { createdAt: 'asc' },
      })
      expect(history).toHaveLength(2)
      expect(history[1]?.fromStatus).toBe('PENDING')
      expect(history[1]?.toStatus).toBe('ACTIVE')

      const audit = await prisma.auditLog.findFirst({
        where: {
          orgId: user.orgId,
          userId: user.userId,
          resource: 'policy',
          resourceId: created.id,
          action: 'policy.transitioned',
        },
      })
      expect(audit).not.toBeNull()
    })

    it('applies cancellation side-effects when transitioning to CANCELLED', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const insurer = await createInsurer(user.orgId)
      const created = await createPolicyViaApi(agent, client.id, insurer.id)
      await agent
        .post(policyTransitionUrl(created.id))
        .send({ status: 'ACTIVE' })

      const response = await agent.post(policyTransitionUrl(created.id)).send({
        status: 'CANCELLED',
        reason: 'Contract termination requested',
      })
      expect(response.status).toBe(200)

      const parsed = getPolicyByIdResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return
      expect(parsed.data.status).toBe('CANCELLED')
      expect(parsed.data.cancellationReason).toBe(
        'Contract termination requested',
      )
      expect(parsed.data.cancelledAt).not.toBeNull()
    })

    it('clears cancellation fields when transitioning to non-cancelled status', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const insurer = await createInsurer(user.orgId)
      const created = await createPolicyViaApi(agent, client.id, insurer.id)
      await agent
        .post(policyTransitionUrl(created.id))
        .send({ status: 'ACTIVE' })
      await prisma.policy.update({
        where: { id: created.id },
        data: {
          cancellationReason: 'Stale cancel reason',
          cancelledAt: new Date('2026-06-01'),
        },
      })

      const response = await agent.post(policyTransitionUrl(created.id)).send({
        status: 'SUSPENDED',
        reason: 'Temporary suspension',
      })
      expect(response.status).toBe(200)

      const parsed = getPolicyByIdResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return
      expect(parsed.data.status).toBe('SUSPENDED')
      expect(parsed.data.cancellationReason).toBeNull()
      expect(parsed.data.cancelledAt).toBeNull()
    })
  })
})

describe('DELETE /policies/:id', () => {
  it('requires authentication', async () => {
    const response = await request(app).delete(policyByIdUrl(randomUUID()))
    expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
  })

  it('rejects invalid UUID param', async () => {
    const { agent } = await authenticatedAgent()
    const response = await agent.delete(policyByIdUrl('not-a-uuid'))

    expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
  })

  it('returns 404 when policy does not exist', async () => {
    const { agent } = await authenticatedAgent()
    const response = await agent.delete(policyByIdUrl(randomUUID()))

    expectError(
      response,
      404,
      ERROR_CODES.POLICIES_POLICY_NOT_FOUND,
      'Policy not found',
    )
  })

  it('returns 403 for ADMIN without client assignment', async () => {
    const { agent, user } = await authenticatedAgent(ROLES.ADMIN)
    const client = await createClient(user.orgId)
    const insurer = await createInsurer(user.orgId)
    const policy = await createPolicy(user.orgId, client.id, insurer.id)

    const response = await agent.delete(policyByIdUrl(policy.id))

    expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
  })

  it('returns 403 for MEMBER without linked affiliate', async () => {
    const { agent, user } = await authenticatedAgent(ROLES.MEMBER)
    const client = await createClient(user.orgId)
    const insurer = await createInsurer(user.orgId)
    const policy = await createPolicy(user.orgId, client.id, insurer.id)

    const response = await agent.delete(policyByIdUrl(policy.id))

    expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
  })

  it('deletes policy and writes audit record', async () => {
    const { agent, user } = await authenticatedAgent()
    const client = await createClient(user.orgId)
    const insurer = await createInsurer(user.orgId)
    const created = await createPolicyViaApi(
      agent,
      client.id,
      insurer.id,
      'POL-DELETE-001',
    )

    const response = await agent.delete(policyByIdUrl(created.id))
    expect(response.status).toBe(200)

    const parsed = deletePolicyResponseSchema.safeParse(response.body)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.message).toBe('Policy deleted')

    const existing = await prisma.policy.findUnique({
      where: { id: created.id },
    })
    expect(existing).toBeNull()

    const audit = await prisma.auditLog.findFirst({
      where: {
        orgId: user.orgId,
        userId: user.userId,
        resource: 'policy',
        resourceId: created.id,
        action: 'policy.deleted',
      },
    })
    expect(audit).not.toBeNull()
  })
})

import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import request from 'supertest'
import {
  API_ROUTES,
  ERROR_CODES,
  ROLES,
  getPolicyByIdResponseSchema,
  listPoliciesItemSchema,
  listPoliciesResponseSchema,
  lookupPolicyClientsResponseSchema,
  lookupPolicyInsurersResponseSchema,
  policyHistoryResponseSchema,
  policyTimelineResponseSchema,
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

function policyHistoryUrl(id: string) {
  return API_ROUTES.policies.history.replace(':id', id)
}

function policyTimelineUrl(id: string) {
  return API_ROUTES.policies.timeline.replace(':id', id)
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

describe('GET /policies/:id', () => {
  describe('authentication and validation', () => {
    it('requires authentication', async () => {
      const response = await request(app).get(policyByIdUrl(randomUUID()))
      expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
    })

    it('rejects invalid UUID param', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.get(policyByIdUrl('not-a-uuid'))

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('policy lookup', () => {
    it('returns 404 when policy does not exist', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.get(
        policyByIdUrl('a0000000-0000-4000-8000-000000000001'),
      )

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
        'POL-OTHER-ORG-001',
      )

      const { agent } = await authenticatedAgent()
      const response = await agent.get(policyByIdUrl(otherPolicy.id))

      expectError(
        response,
        404,
        ERROR_CODES.POLICIES_POLICY_NOT_FOUND,
        'Policy not found',
      )
    })
  })

  describe('successful retrieval', () => {
    it('returns policy and matches schema', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const insurer = await createInsurer(user.orgId, {
        name: 'Aseguradora Uno',
      })
      const created = await createPolicyViaApi(
        agent,
        client.id,
        insurer.id,
        'POL-GET-001',
      )

      const response = await agent.get(policyByIdUrl(created.id))
      expect(response.status).toBe(200)

      const parsed = getPolicyByIdResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.id).toBe(created.id)
      expect(parsed.data.policyNumber).toBe('POL-GET-001')
      expect(parsed.data.status).toBe('PENDING')
      expect(parsed.data.clientId).toBe(client.id)
      expect(parsed.data.clientName).toBe(client.name)
      expect(parsed.data.insurerId).toBe(insurer.id)
      expect(parsed.data.insurerName).toBe('Aseguradora Uno')
      expect(parsed.data.planName).toBe('Plan Corporativo')
      expect(parsed.data.employeeClass).toBe('Administrativo')
      expect(parsed.data.maxCoverage).toBe('500000')
      expect(parsed.data.deductible).toBe('1200')
      expect(parsed.data.cancellationReason).toBeNull()
      expect(parsed.data.cancelledAt).toBeNull()
    })
  })

  describe('permission scoping', () => {
    it('rejects users with no policies:read permission', async () => {
      const noPermRole = await prisma.role.create({
        data: { name: 'NO_POLICIES_READ', description: 'No policies read' },
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

      const response = await agent.get(policyByIdUrl(randomUUID()))
      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })

    describe('all scope (OWNER)', () => {
      it('reads any policy in org without user_clients entry', async () => {
        const { agent, user } = await authenticatedAgent()
        const client = await createClient(user.orgId)
        const insurer = await createInsurer(user.orgId)
        const policy = await createPolicy(user.orgId, client.id, insurer.id)

        const response = await agent.get(policyByIdUrl(policy.id))

        expect(response.status).toBe(200)
      })
    })

    describe('client scope (ADMIN)', () => {
      it('returns 403 when user has no user_clients entry', async () => {
        const { agent, user } = await authenticatedAgent(ROLES.ADMIN)
        const client = await createClient(user.orgId)
        const insurer = await createInsurer(user.orgId)
        const policy = await createPolicy(user.orgId, client.id, insurer.id)

        const response = await agent.get(policyByIdUrl(policy.id))

        expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
      })

      it('reads policy when user has user_clients entry', async () => {
        const { agent, user } = await authenticatedAgent(ROLES.ADMIN)
        const client = await createClient(user.orgId)
        await createUserClient(user.userId, client.id)
        const insurer = await createInsurer(user.orgId)
        const policy = await createPolicy(user.orgId, client.id, insurer.id)

        const response = await agent.get(policyByIdUrl(policy.id))
        expect(response.status).toBe(200)
      })

      it('returns 403 for a policy under a different client', async () => {
        const { agent, user } = await authenticatedAgent(ROLES.ADMIN)
        const clientA = await createClient(user.orgId)
        const clientB = await createClient(user.orgId)
        await createUserClient(user.userId, clientA.id)
        const insurer = await createInsurer(user.orgId)
        const policy = await createPolicy(user.orgId, clientB.id, insurer.id)

        const response = await agent.get(policyByIdUrl(policy.id))

        expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
      })
    })

    describe('own scope (MEMBER)', () => {
      it('returns 403 when user has no linked affiliate for policy client', async () => {
        const { agent, user } = await authenticatedAgent(ROLES.MEMBER)
        const client = await createClient(user.orgId)
        const insurer = await createInsurer(user.orgId)
        const policy = await createPolicy(user.orgId, client.id, insurer.id)

        const response = await agent.get(policyByIdUrl(policy.id))

        expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
      })

      it('reads policy when member is linked to policy client via affiliate', async () => {
        const { agent, user } = await authenticatedAgent(ROLES.MEMBER)
        const client = await createClient(user.orgId)
        await createAffiliate(user.orgId, client.id, {
          userId: user.userId,
        })
        const insurer = await createInsurer(user.orgId)
        const policy = await createPolicy(user.orgId, client.id, insurer.id)

        const response = await agent.get(policyByIdUrl(policy.id))
        expect(response.status).toBe(200)
      })

      it('returns 403 for a policy under a different client', async () => {
        const { agent, user } = await authenticatedAgent(ROLES.MEMBER)
        const clientA = await createClient(user.orgId)
        const clientB = await createClient(user.orgId)
        await createAffiliate(user.orgId, clientA.id, {
          userId: user.userId,
        })
        const insurer = await createInsurer(user.orgId)
        const policy = await createPolicy(user.orgId, clientB.id, insurer.id)

        const response = await agent.get(policyByIdUrl(policy.id))

        expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
      })
    })
  })
})

describe('GET /policies', () => {
  describe('authentication and validation', () => {
    it('requires authentication', async () => {
      const response = await request(app).get(API_ROUTES.policies.list)
      expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
    })

    it('rejects invalid status value', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .get(API_ROUTES.policies.list)
        .query({ status: 'INVALID' })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects page lower than 1', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .get(API_ROUTES.policies.list)
        .query({ page: 0 })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects limit greater than 100', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .get(API_ROUTES.policies.list)
        .query({ limit: 101 })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects page greater than 1000', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .get(API_ROUTES.policies.list)
        .query({ page: 1001 })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('listing behavior', () => {
    it('returns empty list and pagination metadata by default', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.get(API_ROUTES.policies.list)
      expect(response.status).toBe(200)

      const parsed = listPoliciesResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.data).toEqual([])
      expect(parsed.data.meta).toEqual({
        page: 1,
        limit: 20,
        totalCount: 0,
        totalPages: 0,
      })
    })

    it('applies search, status filters, sorting and pagination', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId, { name: 'Cliente Polaris' })
      const insurer = await createInsurer(user.orgId, { name: 'Insurer Prime' })

      await createPolicyViaApi(agent, client.id, insurer.id, 'POL-LIST-002')
      await createPolicyViaApi(agent, client.id, insurer.id, 'POL-LIST-001')

      const response = await agent.get(API_ROUTES.policies.list).query({
        search: 'POL-LIST',
        status: ['PENDING'],
        sortBy: 'policyNumber',
        sortOrder: 'asc',
        page: 1,
        limit: 1,
      })

      expect(response.status).toBe(200)
      const parsed = listPoliciesResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.data).toHaveLength(1)
      expect(parsed.data.data[0]?.policyNumber).toBe('POL-LIST-001')
      expect(parsed.data.meta.totalCount).toBeGreaterThanOrEqual(2)
      expect(
        listPoliciesItemSchema.safeParse(parsed.data.data[0]).success,
      ).toBe(true)
    })

    it('matches search query by planName and employeeClass', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)
      const insurer = await createInsurer(user.orgId)

      await createPolicyViaApi(agent, client.id, insurer.id, 'POL-PLAN-001')

      const byPlan = await agent.get(API_ROUTES.policies.list).query({
        search: 'Corporativo',
      })
      expect(byPlan.status).toBe(200)
      const byPlanParsed = listPoliciesResponseSchema.safeParse(byPlan.body)
      expect(byPlanParsed.success).toBe(true)
      if (!byPlanParsed.success) return
      expect(
        byPlanParsed.data.data.some(
          (item) => item.policyNumber === 'POL-PLAN-001',
        ),
      ).toBe(true)

      const byClass = await agent.get(API_ROUTES.policies.list).query({
        search: 'Administrativo',
      })
      expect(byClass.status).toBe(200)
      const byClassParsed = listPoliciesResponseSchema.safeParse(byClass.body)
      expect(byClassParsed.success).toBe(true)
      if (!byClassParsed.success) return
      expect(
        byClassParsed.data.data.some(
          (item) => item.policyNumber === 'POL-PLAN-001',
        ),
      ).toBe(true)
    })
  })

  describe('permission scoping', () => {
    it('ADMIN only sees policies for assigned clients', async () => {
      const { agent, user } = await authenticatedAgent(ROLES.ADMIN)
      const clientA = await createClient(user.orgId, { name: 'Client A' })
      const clientB = await createClient(user.orgId, { name: 'Client B' })
      const insurer = await createInsurer(user.orgId)

      await createPolicy(user.orgId, clientA.id, insurer.id)
      await createPolicy(user.orgId, clientB.id, insurer.id)
      await createUserClient(user.userId, clientA.id)

      const response = await agent.get(API_ROUTES.policies.list)
      expect(response.status).toBe(200)

      const parsed = listPoliciesResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return
      expect(
        parsed.data.data.every((policy) => policy.clientId === clientA.id),
      ).toBe(true)
    })

    it('MEMBER only sees policies for linked affiliate clients', async () => {
      const { agent, user } = await authenticatedAgent(ROLES.MEMBER)
      const clientA = await createClient(user.orgId, { name: 'Client A' })
      const clientB = await createClient(user.orgId, { name: 'Client B' })
      const insurer = await createInsurer(user.orgId)

      await createPolicy(user.orgId, clientA.id, insurer.id)
      await createPolicy(user.orgId, clientB.id, insurer.id)
      await createAffiliate(user.orgId, clientA.id, { userId: user.userId })

      const response = await agent.get(API_ROUTES.policies.list)
      expect(response.status).toBe(200)

      const parsed = listPoliciesResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return
      expect(
        parsed.data.data.every((policy) => policy.clientId === clientA.id),
      ).toBe(true)
    })
  })
})

describe('GET /policies/lookup/clients', () => {
  it('requires authentication', async () => {
    const response = await request(app).get(API_ROUTES.policies.lookupClients)
    expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
  })

  it('rejects invalid pagination query', async () => {
    const { agent } = await authenticatedAgent()
    const response = await agent
      .get(API_ROUTES.policies.lookupClients)
      .query({ page: 0 })

    expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
  })

  it('returns active clients with pagination metadata and search', async () => {
    const { agent, user } = await authenticatedAgent()
    const clientA = await createClient(user.orgId, { name: 'Lookup Client A' })
    await createClient(user.orgId, { name: 'Lookup Client B' })
    await createClient(user.orgId, { name: 'Inactive Client', isActive: false })

    const response = await agent
      .get(API_ROUTES.policies.lookupClients)
      .query({ search: 'Lookup Client', page: 1, limit: 10 })

    expect(response.status).toBe(200)
    const parsed = lookupPolicyClientsResponseSchema.safeParse(response.body)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.data.some((item) => item.id === clientA.id)).toBe(true)
    expect(
      parsed.data.data.every((item) => item.name.includes('Lookup Client')),
    ).toBe(true)
    expect(parsed.data.meta.page).toBe(1)
  })

  it('ADMIN only sees assigned clients', async () => {
    const { agent, user } = await authenticatedAgent(ROLES.ADMIN)
    const clientA = await createClient(user.orgId, { name: 'Client A' })
    await createClient(user.orgId, { name: 'Client B' })
    await createUserClient(user.userId, clientA.id)

    const response = await agent.get(API_ROUTES.policies.lookupClients)
    expect(response.status).toBe(200)
    const parsed = lookupPolicyClientsResponseSchema.safeParse(response.body)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.data.every((client) => client.id === clientA.id)).toBe(
      true,
    )
  })

  it('MEMBER only sees linked affiliate clients', async () => {
    const { agent, user } = await authenticatedAgent(ROLES.MEMBER)
    const clientA = await createClient(user.orgId, { name: 'Client A' })
    await createClient(user.orgId, { name: 'Client B' })
    await createAffiliate(user.orgId, clientA.id, { userId: user.userId })

    const response = await agent.get(API_ROUTES.policies.lookupClients)
    expect(response.status).toBe(200)
    const parsed = lookupPolicyClientsResponseSchema.safeParse(response.body)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.data.every((client) => client.id === clientA.id)).toBe(
      true,
    )
  })
})

describe('GET /policies/lookup/insurers', () => {
  it('requires authentication', async () => {
    const response = await request(app).get(API_ROUTES.policies.lookupInsurers)
    expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
  })

  it('rejects invalid pagination query', async () => {
    const { agent } = await authenticatedAgent()
    const response = await agent
      .get(API_ROUTES.policies.lookupInsurers)
      .query({ page: 0 })

    expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
  })

  it('returns active insurers and supports search by name and code', async () => {
    const { agent, user } = await authenticatedAgent()
    const insurerA = await createInsurer(user.orgId, { name: 'Health Prime' })
    const insurerB = await createInsurer(user.orgId, { name: 'Life Plus' })
    await prisma.insurer.update({
      where: { id: insurerA.id },
      data: { code: 'HPRIME' },
    })
    await prisma.insurer.update({
      where: { id: insurerB.id },
      data: { code: 'LPLUS' },
    })
    const inactive = await createInsurer(user.orgId, { name: 'Inactive Inc' })
    await prisma.insurer.update({
      where: { id: inactive.id },
      data: { isActive: false, code: 'INACTIVE' },
    })

    const byName = await agent
      .get(API_ROUTES.policies.lookupInsurers)
      .query({ search: 'Health', page: 1, limit: 10 })
    expect(byName.status).toBe(200)
    const byNameParsed = lookupPolicyInsurersResponseSchema.safeParse(
      byName.body,
    )
    expect(byNameParsed.success).toBe(true)
    if (!byNameParsed.success) return
    expect(byNameParsed.data.data.some((item) => item.id === insurerA.id)).toBe(
      true,
    )

    const byCode = await agent
      .get(API_ROUTES.policies.lookupInsurers)
      .query({ search: 'LPLUS', page: 1, limit: 10 })
    expect(byCode.status).toBe(200)
    const byCodeParsed = lookupPolicyInsurersResponseSchema.safeParse(
      byCode.body,
    )
    expect(byCodeParsed.success).toBe(true)
    if (!byCodeParsed.success) return
    expect(byCodeParsed.data.data.some((item) => item.id === insurerB.id)).toBe(
      true,
    )
    expect(byCodeParsed.data.data.some((item) => item.id === inactive.id)).toBe(
      false,
    )
  })
})

describe('GET /policies/:id/history', () => {
  it('requires authentication', async () => {
    const response = await request(app).get(policyHistoryUrl(randomUUID()))
    expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
  })

  it('rejects invalid UUID param', async () => {
    const { agent } = await authenticatedAgent()
    const response = await agent.get(policyHistoryUrl('not-a-uuid'))

    expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
  })

  it('rejects invalid pagination query', async () => {
    const { agent } = await authenticatedAgent()
    const response = await agent.get(policyHistoryUrl(randomUUID())).query({
      page: 0,
    })

    expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
  })

  it('returns 404 when policy does not exist', async () => {
    const { agent } = await authenticatedAgent()
    const response = await agent.get(policyHistoryUrl(randomUUID()))

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

    const response = await agent.get(policyHistoryUrl(policy.id))

    expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
  })

  it('returns paginated history sorted by createdAt desc', async () => {
    const { agent, user } = await authenticatedAgent()
    const client = await createClient(user.orgId)
    const insurer = await createInsurer(user.orgId)
    const created = await createPolicyViaApi(
      agent,
      client.id,
      insurer.id,
      'POL-HISTORY-001',
    )
    await agent.post(policyTransitionUrl(created.id)).send({ status: 'ACTIVE' })
    await agent.post(policyTransitionUrl(created.id)).send({
      status: 'SUSPENDED',
      reason: 'Pending review',
    })

    const response = await agent
      .get(policyHistoryUrl(created.id))
      .query({ page: 1, limit: 20 })

    expect(response.status).toBe(200)
    const parsed = policyHistoryResponseSchema.safeParse(response.body)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.data.length).toBeGreaterThanOrEqual(3)
    expect(parsed.data.data[0]?.toStatus).toBe('SUSPENDED')
    expect(parsed.data.meta.page).toBe(1)
  })
})

describe('GET /policies/:id/timeline', () => {
  it('requires authentication', async () => {
    const response = await request(app).get(policyTimelineUrl(randomUUID()))
    expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
  })

  it('rejects invalid UUID param', async () => {
    const { agent } = await authenticatedAgent()
    const response = await agent.get(policyTimelineUrl('not-a-uuid'))

    expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
  })

  it('rejects invalid pagination query', async () => {
    const { agent } = await authenticatedAgent()
    const response = await agent.get(policyTimelineUrl(randomUUID())).query({
      page: 0,
    })

    expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
  })

  it('returns 404 when policy does not exist', async () => {
    const { agent } = await authenticatedAgent()
    const response = await agent.get(policyTimelineUrl(randomUUID()))

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

    const response = await agent.get(policyTimelineUrl(policy.id))

    expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
  })

  it('returns only policy timeline actions with pagination metadata', async () => {
    const { agent, user } = await authenticatedAgent()
    const client = await createClient(user.orgId)
    const insurer = await createInsurer(user.orgId)
    const created = await createPolicyViaApi(
      agent,
      client.id,
      insurer.id,
      'POL-TIMELINE-001',
    )
    await agent.patch(policyByIdUrl(created.id)).send({ tPremium: '100.00' })
    await agent.post(policyTransitionUrl(created.id)).send({ status: 'ACTIVE' })

    const response = await agent
      .get(policyTimelineUrl(created.id))
      .query({ page: 1, limit: 20 })

    expect(response.status).toBe(200)
    const parsed = policyTimelineResponseSchema.safeParse(response.body)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    const actions = parsed.data.data.map((item) => item.action)
    expect(actions).toContain('policy.created')
    expect(actions).toContain('policy.updated')
    expect(actions).toContain('policy.transitioned')
    expect(actions.every((action) => action.startsWith('policy.'))).toBe(true)
    expect(parsed.data.meta.page).toBe(1)
  })
})

import { describe, expect, it } from 'vitest'
import request from 'supertest'
import {
  API_ROUTES,
  ERROR_CODES,
  ROLES,
  clientPoliciesResponseSchema,
  clientTimelineResponseSchema,
  getClientByIdResponseSchema,
  listClientsResponseSchema,
} from '@friendly-system/shared'
import { prisma } from '../../../shared/db/prisma.js'
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
} from './clients.integration.shared.js'

function clientByIdUrl(id: string) {
  return API_ROUTES.clients.getById.replace(':id', id)
}

function clientTimelineUrl(id: string) {
  return API_ROUTES.clients.timeline.replace(':id', id)
}

function clientPoliciesUrl(id: string) {
  return API_ROUTES.clients.policies.replace(':id', id)
}

describe('GET /clients/:id', () => {
  describe('authentication guard', () => {
    it('requires authentication', async () => {
      const response = await request(app).get(
        clientByIdUrl('a0000000-0000-4000-8000-000000000000'),
      )

      expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
    })
  })

  describe('input validation', () => {
    it('rejects invalid UUID param', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.get(clientByIdUrl('not-a-uuid'))

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('lookup behavior', () => {
    it('returns 404 when client does not exist', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.get(
        clientByIdUrl('a0000000-0000-4000-8000-000000000001'),
      )

      expectError(
        response,
        404,
        ERROR_CODES.CLIENTS_CLIENT_NOT_FOUND,
        'Client not found',
      )
    })

    it('returns 404 when client belongs to a different org', async () => {
      const { agent: otherAgent, user: otherUser } = await authenticatedAgent()
      const otherClient = await createClient(otherUser.orgId)

      const { agent } = await authenticatedAgent()
      const response = await agent.get(clientByIdUrl(otherClient.id))

      expectError(
        response,
        404,
        ERROR_CODES.CLIENTS_CLIENT_NOT_FOUND,
        'Client not found',
      )
      expect(otherAgent).toBeDefined()
    })
  })

  describe('successful retrieval', () => {
    it('returns client and matches schema', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId, { name: 'Cliente Uno' })

      const response = await agent.get(clientByIdUrl(client.id))

      expect(response.status).toBe(200)
      const parsed = getClientByIdResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.id).toBe(client.id)
      expect(parsed.data.orgId).toBe(user.orgId)
      expect(parsed.data.name).toBe('Cliente Uno')
      expect(parsed.data.isActive).toBe(true)
    })
  })

  describe('permission scoping', () => {
    describe('all scope (OWNER)', () => {
      it('reads any client in org', async () => {
        const { agent, user } = await authenticatedAgent()
        const client = await createClient(user.orgId)

        const response = await agent.get(clientByIdUrl(client.id))

        expect(response.status).toBe(200)
      })
    })

    describe('client scope (ADMIN)', () => {
      it('returns 403 without user_clients relation', async () => {
        const { agent, user } = await authenticatedAgent(ROLES.ADMIN)
        const client = await createClient(user.orgId)

        const response = await agent.get(clientByIdUrl(client.id))

        expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
      })

      it('reads client with user_clients relation', async () => {
        const { agent, user } = await authenticatedAgent(ROLES.ADMIN)
        const client = await createClient(user.orgId)
        await createUserClient(user.userId, client.id)

        const response = await agent.get(clientByIdUrl(client.id))

        expect(response.status).toBe(200)
      })
    })

    describe('own scope (MEMBER)', () => {
      it('returns 403 when user has no active affiliate linked to client', async () => {
        const { agent, user } = await authenticatedAgent(ROLES.MEMBER)
        const client = await createClient(user.orgId)

        const response = await agent.get(clientByIdUrl(client.id))

        expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
      })

      it('reads client when user has active affiliate linked to client', async () => {
        const { agent, user } = await authenticatedAgent(ROLES.MEMBER)
        const client = await createClient(user.orgId)
        await createAffiliate(user.orgId, client.id, {
          userId: user.userId,
          isActive: true,
        })

        const response = await agent.get(clientByIdUrl(client.id))

        expect(response.status).toBe(200)
      })
    })
  })
})

describe('GET /clients', () => {
  describe('authentication guard', () => {
    it('requires authentication', async () => {
      const response = await request(app).get(API_ROUTES.clients.list)

      expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
    })
  })

  describe('input validation', () => {
    it('rejects invalid boolean filter', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .get(API_ROUTES.clients.list)
        .query({ isActive: 'x' })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects page lower than minimum', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .get(API_ROUTES.clients.list)
        .query({ page: 0 })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('listing behavior', () => {
    it('returns empty list and metadata by default', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.get(API_ROUTES.clients.list)

      expect(response.status).toBe(200)
      const parsed = listClientsResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.data).toHaveLength(0)
      expect(parsed.data.meta.page).toBe(1)
      expect(parsed.data.meta.limit).toBe(20)
      expect(parsed.data.meta.totalCount).toBe(0)
      expect(parsed.data.meta.totalPages).toBe(0)
    })

    it('includes active and inactive clients when no filter is provided', async () => {
      const { agent, user } = await authenticatedAgent()
      await createClient(user.orgId, { name: 'Activo', isActive: true })
      await createClient(user.orgId, { name: 'Inactivo', isActive: false })

      const response = await agent.get(API_ROUTES.clients.list)

      expect(response.status).toBe(200)
      const parsed = listClientsResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.data).toHaveLength(2)
      expect(parsed.data.data.some((item) => item.name === 'Activo')).toBe(true)
      expect(parsed.data.data.some((item) => item.name === 'Inactivo')).toBe(
        true,
      )
    })

    it('applies search, active filter, sorting and pagination', async () => {
      const { agent, user } = await authenticatedAgent()
      await createClient(user.orgId, { name: 'Alpha Salud', isActive: true })
      await createClient(user.orgId, { name: 'Bravo Vida', isActive: true })
      await createClient(user.orgId, { name: 'Charlie Salud', isActive: false })

      const response = await agent.get(API_ROUTES.clients.list).query({
        search: 'salud',
        isActive: true,
        sortBy: 'name',
        sortOrder: 'asc',
        page: 1,
        limit: 1,
      })

      expect(response.status).toBe(200)
      const parsed = listClientsResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.data).toHaveLength(1)
      expect(parsed.data.data[0]?.name).toBe('Alpha Salud')
      expect(parsed.data.meta.totalCount).toBe(1)
      expect(parsed.data.meta.totalPages).toBe(1)
    })
  })

  describe('scope filters', () => {
    it('restricts admin results to assigned user_clients', async () => {
      const { agent, user } = await authenticatedAgent(ROLES.ADMIN)
      const visibleClient = await createClient(user.orgId, {
        name: 'Visible Client',
      })
      await createClient(user.orgId, { name: 'Hidden Client' })
      await createUserClient(user.userId, visibleClient.id)

      const response = await agent.get(API_ROUTES.clients.list)

      expect(response.status).toBe(200)
      const parsed = listClientsResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.data.map((item) => item.name)).toEqual([
        'Visible Client',
      ])
    })

    it('restricts member results to active affiliate-linked clients', async () => {
      const { agent, user } = await authenticatedAgent(ROLES.MEMBER)
      const visibleClient = await createClient(user.orgId, {
        name: 'Visible Own Client',
      })
      const hiddenClient = await createClient(user.orgId, {
        name: 'Hidden Own Client',
      })

      await createAffiliate(user.orgId, visibleClient.id, {
        userId: user.userId,
        isActive: true,
      })
      await createAffiliate(user.orgId, hiddenClient.id, {
        userId: user.userId,
        isActive: false,
      })

      const response = await agent.get(API_ROUTES.clients.list)

      expect(response.status).toBe(200)
      const parsed = listClientsResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.data.map((item) => item.name)).toEqual([
        'Visible Own Client',
      ])
    })
  })
})

describe('GET /clients/:id/timeline', () => {
  describe('authentication and validation', () => {
    it('requires authentication', async () => {
      const response = await request(app).get(
        clientTimelineUrl('a0000000-0000-4000-8000-000000000000'),
      )

      expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
    })

    it('rejects invalid pagination query', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .get(clientTimelineUrl('a0000000-0000-4000-8000-000000000000'))
        .query({ page: 0 })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })
  })

  it('returns only client timeline actions with pagination metadata', async () => {
    const { agent, user } = await authenticatedAgent()
    const createResponse = await agent.post(API_ROUTES.clients.create).send({
      name: 'Timeline Client',
      isActive: true,
    })
    expect(createResponse.status).toBe(201)
    const clientId = (createResponse.body as { id: string }).id

    const updateResponse = await agent.patch(clientByIdUrl(clientId)).send({
      name: 'Timeline Client Updated',
    })
    expect(updateResponse.status).toBe(200)

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        orgId: user.orgId,
        action: 'auth.login',
        resource: 'session',
        resourceId: user.userId,
      },
    })

    const response = await agent
      .get(clientTimelineUrl(clientId))
      .query({ page: 1, limit: 20 })

    expect(response.status).toBe(200)
    const parsed = clientTimelineResponseSchema.safeParse(response.body)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.data.length).toBeGreaterThanOrEqual(2)
    expect(
      parsed.data.data.every((item) =>
        ['client.created', 'client.updated', 'client.deactivated'].includes(
          item.action,
        ),
      ),
    ).toBe(true)
    expect(parsed.data.meta.page).toBe(1)
    expect(parsed.data.meta.limit).toBe(20)
    expect(parsed.data.meta.totalCount).toBeGreaterThanOrEqual(2)
  })
})

describe('GET /clients/:id/policies', () => {
  describe('authentication and validation', () => {
    it('requires authentication', async () => {
      const response = await request(app).get(
        clientPoliciesUrl('a0000000-0000-4000-8000-000000000000'),
      )

      expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
    })

    it('rejects invalid query params', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .get(clientPoliciesUrl('a0000000-0000-4000-8000-000000000000'))
        .query({ limit: 0 })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })
  })

  it('returns paginated policies for a client', async () => {
    const { agent, user } = await authenticatedAgent()
    const client = await createClient(user.orgId, { name: 'Policy Client' })
    const insurer = await createInsurer(user.orgId, { name: 'Insurer One' })
    await createPolicy(user.orgId, client.id, insurer.id, {
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
    })

    const response = await agent
      .get(clientPoliciesUrl(client.id))
      .query({ page: 1, limit: 20 })

    expect(response.status).toBe(200)
    const parsed = clientPoliciesResponseSchema.safeParse(response.body)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.data).toHaveLength(1)
    expect(parsed.data.data[0]?.insurerName).toBe('Insurer One')
    expect(parsed.data.meta.totalCount).toBe(1)
    expect(parsed.data.meta.totalPages).toBe(1)
  })

  it('enforces client scope for admin users', async () => {
    const { agent, user } = await authenticatedAgent(ROLES.ADMIN)
    const client = await createClient(user.orgId)

    const deniedResponse = await agent.get(clientPoliciesUrl(client.id))
    expectError(deniedResponse, 403, ERROR_CODES.PERMISSION_DENIED)

    await createUserClient(user.userId, client.id)

    const allowedResponse = await agent.get(clientPoliciesUrl(client.id))
    expect(allowedResponse.status).toBe(200)
  })
})

import { describe, expect, it } from 'vitest'
import request from 'supertest'
import {
  API_ROUTES,
  ERROR_CODES,
  ROLES,
  getInsurerByIdResponseSchema,
  insurerTimelineResponseSchema,
  listInsurersResponseSchema,
} from '@friendly-system/shared'
import { prisma } from '../../../shared/db/prisma.js'
import { createInsurer } from '../../../test/factories/claims.factory.js'
import {
  app,
  authenticatedAgent,
  expectError,
} from './insurers.integration.shared.js'

function insurerByIdUrl(id: string) {
  return API_ROUTES.insurers.getById.replace(':id', id)
}

function insurerTimelineUrl(id: string) {
  return API_ROUTES.insurers.timeline.replace(':id', id)
}

describe('GET /insurers/:id', () => {
  describe('authentication guard', () => {
    it('requires authentication', async () => {
      const response = await request(app).get(
        insurerByIdUrl('a0000000-0000-4000-8000-000000000000'),
      )

      expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
    })
  })

  describe('input validation', () => {
    it('rejects invalid UUID param', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.get(insurerByIdUrl('not-a-uuid'))

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('lookup behavior', () => {
    it('returns 404 when insurer does not exist', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.get(
        insurerByIdUrl('a0000000-0000-4000-8000-000000000001'),
      )

      expectError(
        response,
        404,
        ERROR_CODES.INSURERS_INSURER_NOT_FOUND,
        'Insurer not found',
      )
    })

    it('returns 404 when insurer belongs to a different org', async () => {
      const { user: otherUser } = await authenticatedAgent()
      const otherInsurer = await createInsurer(otherUser.orgId)

      const { agent } = await authenticatedAgent()
      const response = await agent.get(insurerByIdUrl(otherInsurer.id))

      expectError(
        response,
        404,
        ERROR_CODES.INSURERS_INSURER_NOT_FOUND,
        'Insurer not found',
      )
    })
  })

  describe('successful retrieval', () => {
    it('returns insurer and matches schema', async () => {
      const { agent, user } = await authenticatedAgent()
      const insurer = await createInsurer(user.orgId, { name: 'Insurer Uno' })

      const response = await agent.get(insurerByIdUrl(insurer.id))

      expect(response.status).toBe(200)
      const parsed = getInsurerByIdResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.id).toBe(insurer.id)
      expect(parsed.data.orgId).toBe(user.orgId)
      expect(parsed.data.name).toBe('Insurer Uno')
      expect(parsed.data.type).toBe('MEDICINA_PREPAGADA')
    })
  })

  describe('permission scoping', () => {
    it('rejects admin users (owner-only service scope)', async () => {
      const { agent, user } = await authenticatedAgent(ROLES.ADMIN)
      const insurer = await createInsurer(user.orgId)

      const response = await agent.get(insurerByIdUrl(insurer.id))

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })

    it('rejects member users', async () => {
      const { agent, user } = await authenticatedAgent(ROLES.MEMBER)
      const insurer = await createInsurer(user.orgId)

      const response = await agent.get(insurerByIdUrl(insurer.id))

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })
  })
})

describe('GET /insurers', () => {
  describe('authentication guard', () => {
    it('requires authentication', async () => {
      const response = await request(app).get(API_ROUTES.insurers.list)

      expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
    })
  })

  describe('input validation', () => {
    it('rejects invalid boolean filter', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .get(API_ROUTES.insurers.list)
        .query({ isActive: 'x' })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects page lower than minimum', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .get(API_ROUTES.insurers.list)
        .query({ page: 0 })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('listing behavior', () => {
    it('returns empty list and metadata by default', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.get(API_ROUTES.insurers.list)

      expect(response.status).toBe(200)
      const parsed = listInsurersResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.data).toHaveLength(0)
      expect(parsed.data.meta.page).toBe(1)
      expect(parsed.data.meta.limit).toBe(20)
      expect(parsed.data.meta.totalCount).toBe(0)
      expect(parsed.data.meta.totalPages).toBe(0)
    })

    it('applies search, filters, sorting and pagination', async () => {
      const { agent, user } = await authenticatedAgent()
      await prisma.insurer.create({
        data: {
          orgId: user.orgId,
          name: 'Alpha Salud',
          type: 'MEDICINA_PREPAGADA',
          isActive: true,
        },
      })
      await prisma.insurer.create({
        data: {
          orgId: user.orgId,
          name: 'Bravo Seguros',
          type: 'COMPANIA_DE_SEGUROS',
          isActive: true,
        },
      })
      await prisma.insurer.create({
        data: {
          orgId: user.orgId,
          name: 'Charlie Salud',
          type: 'MEDICINA_PREPAGADA',
          isActive: false,
        },
      })

      const response = await agent.get(API_ROUTES.insurers.list).query({
        search: 'salud',
        isActive: true,
        type: 'MEDICINA_PREPAGADA',
        sortBy: 'name',
        sortOrder: 'asc',
        page: 1,
        limit: 1,
      })

      expect(response.status).toBe(200)
      const parsed = listInsurersResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.data).toHaveLength(1)
      expect(parsed.data.data[0]?.name).toBe('Alpha Salud')
      expect(parsed.data.meta.totalCount).toBe(1)
      expect(parsed.data.meta.totalPages).toBe(1)
    })
  })

  describe('permission scoping', () => {
    it('rejects admin users', async () => {
      const { agent } = await authenticatedAgent(ROLES.ADMIN)

      const response = await agent.get(API_ROUTES.insurers.list)

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })

    it('rejects member users', async () => {
      const { agent } = await authenticatedAgent(ROLES.MEMBER)

      const response = await agent.get(API_ROUTES.insurers.list)

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })
  })
})

describe('GET /insurers/:id/timeline', () => {
  describe('authentication and validation', () => {
    it('requires authentication', async () => {
      const response = await request(app).get(
        insurerTimelineUrl('a0000000-0000-4000-8000-000000000000'),
      )

      expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
    })

    it('rejects invalid pagination query', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .get(insurerTimelineUrl('a0000000-0000-4000-8000-000000000000'))
        .query({ page: 0 })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })
  })

  it('returns only insurer timeline actions with pagination metadata', async () => {
    const { agent, user } = await authenticatedAgent()
    const createResponse = await agent.post(API_ROUTES.insurers.create).send({
      name: 'Timeline Insurer',
      type: 'MEDICINA_PREPAGADA',
      isActive: true,
    })
    expect(createResponse.status).toBe(201)
    const insurerId = (createResponse.body as { id: string }).id

    const updateResponse = await agent.patch(insurerByIdUrl(insurerId)).send({
      name: 'Timeline Insurer Updated',
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
      .get(insurerTimelineUrl(insurerId))
      .query({ page: 1, limit: 20 })

    expect(response.status).toBe(200)
    const parsed = insurerTimelineResponseSchema.safeParse(response.body)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.data.length).toBeGreaterThanOrEqual(2)
    expect(
      parsed.data.data.every((item) =>
        ['insurer.created', 'insurer.updated', 'insurer.deactivated'].includes(
          item.action,
        ),
      ),
    ).toBe(true)
    expect(parsed.data.meta.page).toBe(1)
    expect(parsed.data.meta.limit).toBe(20)
    expect(parsed.data.meta.totalCount).toBeGreaterThanOrEqual(2)
  })
})

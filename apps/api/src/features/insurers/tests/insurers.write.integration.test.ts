import { describe, expect, it } from 'vitest'
import request from 'supertest'
import {
  API_ROUTES,
  ERROR_CODES,
  ROLES,
  createInsurerResponseSchema,
  deleteInsurerResponseSchema,
  getInsurerByIdResponseSchema,
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

function deleteInsurerUrl(id: string) {
  return API_ROUTES.insurers.delete.replace(':id', id)
}

describe('POST /insurers', () => {
  describe('authentication guard', () => {
    it('requires authentication', async () => {
      const response = await request(app)
        .post(API_ROUTES.insurers.create)
        .send({
          name: 'Insurer',
          type: 'MEDICINA_PREPAGADA',
        })

      expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
    })
  })

  describe('input validation', () => {
    it('rejects empty body', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.post(API_ROUTES.insurers.create).send({})

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects invalid name', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.post(API_ROUTES.insurers.create).send({
        name: '',
        type: 'MEDICINA_PREPAGADA',
      })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects invalid type', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.post(API_ROUTES.insurers.create).send({
        name: 'Insurer',
        type: 'UNKNOWN',
      })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('successful creation', () => {
    it('creates insurer and matches schema', async () => {
      const { agent, user } = await authenticatedAgent()

      const response = await agent.post(API_ROUTES.insurers.create).send({
        name: 'Insurer Nuevo',
        type: 'MEDICINA_PREPAGADA',
        code: 'INS-NEW',
        email: 'ops@insurer.com',
        phone: '+573001112233',
        website: 'https://insurer.com',
        isActive: true,
      })

      expect(response.status).toBe(201)
      const parsed = createInsurerResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.orgId).toBe(user.orgId)
      expect(parsed.data.name).toBe('Insurer Nuevo')
      expect(parsed.data.code).toBe('INS-NEW')
      expect(parsed.data.type).toBe('MEDICINA_PREPAGADA')
      expect(parsed.data.isActive).toBe(true)

      const dbInsurer = await prisma.insurer.findUnique({
        where: { id: parsed.data.id },
      })
      expect(dbInsurer).not.toBeNull()
      expect(dbInsurer!.orgId).toBe(user.orgId)
      expect(dbInsurer!.name).toBe('Insurer Nuevo')
      expect(dbInsurer!.code).toBe('INS-NEW')

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: 'insurer.created',
          resource: 'insurer',
          resourceId: parsed.data.id,
          userId: user.userId,
        },
      })
      expect(auditLog).not.toBeNull()
      expect(auditLog!.orgId).toBe(user.orgId)
    })

    it('returns 409 when insurer name already exists in org', async () => {
      const { agent, user } = await authenticatedAgent()
      await createInsurer(user.orgId, { name: 'Duplicate Name' })

      const response = await agent.post(API_ROUTES.insurers.create).send({
        name: 'Duplicate Name',
        type: 'COMPANIA_DE_SEGUROS',
      })

      expectError(response, 409, ERROR_CODES.INSURERS_NAME_UNAVAILABLE)
    })

    it('returns 409 when insurer code already exists in org', async () => {
      const { agent } = await authenticatedAgent()

      const first = await agent.post(API_ROUTES.insurers.create).send({
        name: 'Code First',
        type: 'MEDICINA_PREPAGADA',
        code: 'DUP-CODE',
      })
      expect(first.status).toBe(201)

      const response = await agent.post(API_ROUTES.insurers.create).send({
        name: 'Code Second',
        type: 'COMPANIA_DE_SEGUROS',
        code: 'DUP-CODE',
      })

      expectError(response, 409, ERROR_CODES.INSURERS_CODE_UNAVAILABLE)
    })
  })

  describe('permission scoping', () => {
    it('rejects admin users', async () => {
      const { agent } = await authenticatedAgent(ROLES.ADMIN)

      const response = await agent.post(API_ROUTES.insurers.create).send({
        name: 'Denied insurer',
        type: 'MEDICINA_PREPAGADA',
      })

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })

    it('rejects member users', async () => {
      const { agent } = await authenticatedAgent(ROLES.MEMBER)

      const response = await agent.post(API_ROUTES.insurers.create).send({
        name: 'Denied insurer',
        type: 'MEDICINA_PREPAGADA',
      })

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })
  })
})

describe('PATCH /insurers/:id', () => {
  describe('authentication and validation', () => {
    it('requires authentication', async () => {
      const response = await request(app).patch(
        insurerByIdUrl('a0000000-0000-4000-8000-000000000000'),
      )

      expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
    })

    it('rejects invalid UUID param', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.patch(insurerByIdUrl('not-a-uuid')).send({
        name: 'Updated',
      })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects empty update payload', async () => {
      const { agent, user } = await authenticatedAgent()
      const insurer = await createInsurer(user.orgId)

      const response = await agent.patch(insurerByIdUrl(insurer.id)).send({})

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('update behavior', () => {
    it('returns 404 when insurer does not exist', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .patch(insurerByIdUrl('a0000000-0000-4000-8000-000000000001'))
        .send({ name: 'Missing' })

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

      const response = await agent.patch(insurerByIdUrl(otherInsurer.id)).send({
        name: 'Cross org update',
      })

      expectError(
        response,
        404,
        ERROR_CODES.INSURERS_INSURER_NOT_FOUND,
        'Insurer not found',
      )
    })

    it('updates insurer fields and writes audit log', async () => {
      const { agent, user } = await authenticatedAgent()
      const insurer = await createInsurer(user.orgId, {
        name: 'Before update',
      })

      const response = await agent.patch(insurerByIdUrl(insurer.id)).send({
        name: 'After update',
        code: 'CODE-UPDATED',
        isActive: false,
      })

      expect(response.status).toBe(200)
      const parsed = getInsurerByIdResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.name).toBe('After update')
      expect(parsed.data.code).toBe('CODE-UPDATED')
      expect(parsed.data.isActive).toBe(false)

      const dbInsurer = await prisma.insurer.findUniqueOrThrow({
        where: { id: insurer.id },
      })
      expect(dbInsurer.name).toBe('After update')
      expect(dbInsurer.code).toBe('CODE-UPDATED')
      expect(dbInsurer.isActive).toBe(false)

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: 'insurer.updated',
          resource: 'insurer',
          resourceId: insurer.id,
          userId: user.userId,
        },
      })
      expect(auditLog).not.toBeNull()
    })

    it('returns 409 when updating to duplicate name in same org', async () => {
      const { agent, user } = await authenticatedAgent()
      await createInsurer(user.orgId, { name: 'Target Name' })
      const insurer = await createInsurer(user.orgId, { name: 'Other Name' })

      const response = await agent.patch(insurerByIdUrl(insurer.id)).send({
        name: 'Target Name',
      })

      expectError(response, 409, ERROR_CODES.INSURERS_NAME_UNAVAILABLE)
    })
  })

  describe('permission scoping', () => {
    it('rejects admin users', async () => {
      const { agent, user } = await authenticatedAgent(ROLES.ADMIN)
      const insurer = await createInsurer(user.orgId)

      const response = await agent.patch(insurerByIdUrl(insurer.id)).send({
        name: 'Denied update',
      })

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })

    it('rejects member users', async () => {
      const { agent, user } = await authenticatedAgent(ROLES.MEMBER)
      const insurer = await createInsurer(user.orgId)

      const response = await agent.patch(insurerByIdUrl(insurer.id)).send({
        name: 'Denied update',
      })

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })
  })
})

describe('DELETE /insurers/:id', () => {
  describe('authentication and validation', () => {
    it('requires authentication', async () => {
      const response = await request(app).delete(
        deleteInsurerUrl('a0000000-0000-4000-8000-000000000000'),
      )

      expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
    })

    it('rejects invalid UUID param', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.delete(deleteInsurerUrl('not-a-uuid'))

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('semantic delete behavior', () => {
    it('returns 404 when insurer does not exist', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.delete(
        deleteInsurerUrl('a0000000-0000-4000-8000-000000000001'),
      )

      expectError(
        response,
        404,
        ERROR_CODES.INSURERS_INSURER_NOT_FOUND,
        'Insurer not found',
      )
    })

    it('deactivates insurer instead of deleting row', async () => {
      const { agent, user } = await authenticatedAgent()
      const insurer = await createInsurer(user.orgId, {
        name: 'Will deactivate',
      })

      const response = await agent.delete(deleteInsurerUrl(insurer.id))

      expect(response.status).toBe(200)
      const parsed = deleteInsurerResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)

      const dbInsurer = await prisma.insurer.findUnique({
        where: { id: insurer.id },
      })
      expect(dbInsurer).not.toBeNull()
      expect(dbInsurer!.isActive).toBe(false)

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: 'insurer.deactivated',
          resource: 'insurer',
          resourceId: insurer.id,
          userId: user.userId,
        },
      })
      expect(auditLog).not.toBeNull()
    })
  })

  describe('permission scoping', () => {
    it('rejects admin users', async () => {
      const { agent, user } = await authenticatedAgent(ROLES.ADMIN)
      const insurer = await createInsurer(user.orgId)

      const response = await agent.delete(deleteInsurerUrl(insurer.id))

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })

    it('rejects member users', async () => {
      const { agent, user } = await authenticatedAgent(ROLES.MEMBER)
      const insurer = await createInsurer(user.orgId)

      const response = await agent.delete(deleteInsurerUrl(insurer.id))

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })
  })
})

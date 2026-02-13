import { describe, expect, it } from 'vitest'
import request from 'supertest'
import {
  API_ROUTES,
  ERROR_CODES,
  ROLES,
  createClientResponseSchema,
  deleteClientResponseSchema,
  getClientByIdResponseSchema,
} from '@friendly-system/shared'
import { prisma } from '../../../shared/db/prisma.js'
import {
  createClient,
  createUserClient,
} from '../../../test/factories/claims.factory.js'
import { createVerifiedUser } from '../../../test/factories/auth.factory.js'
import {
  app,
  authenticatedAgent,
  expectError,
} from './clients.integration.shared.js'

function clientByIdUrl(id: string) {
  return API_ROUTES.clients.getById.replace(':id', id)
}

function deleteClientUrl(id: string) {
  return API_ROUTES.clients.delete.replace(':id', id)
}

describe('POST /clients', () => {
  describe('authentication guard', () => {
    it('requires authentication', async () => {
      const response = await request(app).post(API_ROUTES.clients.create).send({
        name: 'Cliente',
      })

      expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
    })
  })

  describe('input validation', () => {
    it('rejects empty body', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.post(API_ROUTES.clients.create).send({})

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects invalid name', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.post(API_ROUTES.clients.create).send({
        name: '',
      })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects name with null bytes', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.post(API_ROUTES.clients.create).send({
        name: 'test\0',
      })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('successful creation', () => {
    it('creates client and matches schema', async () => {
      const { agent, user } = await authenticatedAgent()

      const response = await agent.post(API_ROUTES.clients.create).send({
        name: 'Cliente Nuevo',
        isActive: true,
      })

      expect(response.status).toBe(201)
      const parsed = createClientResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.orgId).toBe(user.orgId)
      expect(parsed.data.name).toBe('Cliente Nuevo')
      expect(parsed.data.isActive).toBe(true)

      const dbClient = await prisma.client.findUnique({
        where: { id: parsed.data.id },
      })
      expect(dbClient).not.toBeNull()
      expect(dbClient!.name).toBe('Cliente Nuevo')
      expect(dbClient!.isActive).toBe(true)

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: 'client.created',
          resource: 'client',
          resourceId: parsed.data.id,
          userId: user.userId,
        },
      })
      expect(auditLog).not.toBeNull()
      expect(auditLog!.orgId).toBe(user.orgId)
    })

    it('truncates long user-agent in audit log', async () => {
      const { agent, user } = await authenticatedAgent()
      const longUserAgent = `ua-${'x'.repeat(1024)}`

      const response = await agent
        .post(API_ROUTES.clients.create)
        .set('User-Agent', longUserAgent)
        .send({ name: 'UA Client' })

      expect(response.status).toBe(201)
      const parsed = createClientResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          userId: user.userId,
          action: 'client.created',
          resourceId: parsed.data.id,
        },
      })
      expect(auditLog).not.toBeNull()
      expect(auditLog!.userAgent).toBe(longUserAgent.slice(0, 512))
      expect(auditLog!.userAgent?.length).toBe(512)
    })
  })

  describe('permission scoping', () => {
    it('rejects users without clients:create permission', async () => {
      const noPermRole = await prisma.role.create({
        data: {
          name: 'NO_CLIENT_CREATE_PERMS',
          description: 'No clients create permissions',
        },
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

      const response = await agent.post(API_ROUTES.clients.create).send({
        name: 'Denied client',
      })

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })

    it('allows admin scope to create client', async () => {
      const { agent } = await authenticatedAgent(ROLES.ADMIN)

      const response = await agent.post(API_ROUTES.clients.create).send({
        name: 'Admin created client',
      })

      expect(response.status).toBe(201)
    })

    it('rejects member users (no clients:create permission)', async () => {
      const { agent } = await authenticatedAgent(ROLES.MEMBER)

      const response = await agent.post(API_ROUTES.clients.create).send({
        name: 'Member denied client',
      })

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })
  })
})

describe('PATCH /clients/:id', () => {
  describe('authentication and validation', () => {
    it('requires authentication', async () => {
      const response = await request(app).patch(
        clientByIdUrl('a0000000-0000-4000-8000-000000000000'),
      )

      expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
    })

    it('rejects invalid UUID param', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.patch(clientByIdUrl('not-a-uuid')).send({
        name: 'Updated',
      })

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })

    it('rejects empty update payload', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId)

      const response = await agent.patch(clientByIdUrl(client.id)).send({})

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('update behavior', () => {
    it('returns 404 when client does not exist', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent
        .patch(clientByIdUrl('a0000000-0000-4000-8000-000000000001'))
        .send({ name: 'Missing' })

      expectError(
        response,
        404,
        ERROR_CODES.CLIENTS_CLIENT_NOT_FOUND,
        'Client not found',
      )
    })

    it('returns 404 when client belongs to a different org', async () => {
      const { user: otherUser } = await authenticatedAgent()
      const otherClient = await createClient(otherUser.orgId)
      const { agent } = await authenticatedAgent()

      const response = await agent.patch(clientByIdUrl(otherClient.id)).send({
        name: 'Cross org update',
      })

      expectError(
        response,
        404,
        ERROR_CODES.CLIENTS_CLIENT_NOT_FOUND,
        'Client not found',
      )
    })

    it('updates client fields and writes audit log', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId, {
        name: 'Before update',
        isActive: true,
      })

      const response = await agent.patch(clientByIdUrl(client.id)).send({
        name: 'After update',
        isActive: false,
      })

      expect(response.status).toBe(200)
      const parsed = getClientByIdResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(parsed.data.name).toBe('After update')
      expect(parsed.data.isActive).toBe(false)

      const dbClient = await prisma.client.findUniqueOrThrow({
        where: { id: client.id },
      })
      expect(dbClient.name).toBe('After update')
      expect(dbClient.isActive).toBe(false)

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: 'client.updated',
          resource: 'client',
          resourceId: client.id,
          userId: user.userId,
        },
      })
      expect(auditLog).not.toBeNull()
    })
  })

  describe('permission scoping', () => {
    it('denies admin update without user_clients relation', async () => {
      const { agent, user } = await authenticatedAgent(ROLES.ADMIN)
      const client = await createClient(user.orgId)

      const response = await agent.patch(clientByIdUrl(client.id)).send({
        name: 'Denied update',
      })

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })

    it('allows admin update with user_clients relation', async () => {
      const { agent, user } = await authenticatedAgent(ROLES.ADMIN)
      const client = await createClient(user.orgId, { name: 'Admin target' })
      await createUserClient(user.userId, client.id)

      const response = await agent.patch(clientByIdUrl(client.id)).send({
        name: 'Admin updated',
      })

      expect(response.status).toBe(200)
      expect(response.body.name).toBe('Admin updated')
    })

    it('rejects member users (no clients:update permission)', async () => {
      const { agent, user } = await authenticatedAgent(ROLES.MEMBER)
      const client = await createClient(user.orgId)

      const response = await agent.patch(clientByIdUrl(client.id)).send({
        name: 'Member update',
      })

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })
  })
})

describe('DELETE /clients/:id', () => {
  describe('authentication and validation', () => {
    it('requires authentication', async () => {
      const response = await request(app).delete(
        deleteClientUrl('a0000000-0000-4000-8000-000000000000'),
      )

      expectError(response, 401, ERROR_CODES.AUTH_REQUIRED)
    })

    it('rejects invalid UUID param', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.delete(deleteClientUrl('not-a-uuid'))

      expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
    })
  })

  describe('semantic delete behavior', () => {
    it('returns 404 when client does not exist', async () => {
      const { agent } = await authenticatedAgent()

      const response = await agent.delete(
        deleteClientUrl('a0000000-0000-4000-8000-000000000001'),
      )

      expectError(
        response,
        404,
        ERROR_CODES.CLIENTS_CLIENT_NOT_FOUND,
        'Client not found',
      )
    })

    it('deactivates client instead of deleting row', async () => {
      const { agent, user } = await authenticatedAgent()
      const client = await createClient(user.orgId, {
        name: 'Will deactivate',
        isActive: true,
      })

      const response = await agent.delete(deleteClientUrl(client.id))

      expect(response.status).toBe(200)
      const parsed = deleteClientResponseSchema.safeParse(response.body)
      expect(parsed.success).toBe(true)

      const dbClient = await prisma.client.findUnique({
        where: { id: client.id },
      })
      expect(dbClient).not.toBeNull()
      expect(dbClient!.isActive).toBe(false)

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: 'client.deactivated',
          resource: 'client',
          resourceId: client.id,
          userId: user.userId,
        },
      })
      expect(auditLog).not.toBeNull()
    })
  })

  describe('permission scoping', () => {
    it('denies admin deactivation without user_clients relation', async () => {
      const { agent, user } = await authenticatedAgent(ROLES.ADMIN)
      const client = await createClient(user.orgId)

      const response = await agent.delete(deleteClientUrl(client.id))

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })

    it('allows admin deactivation with user_clients relation', async () => {
      const { agent, user } = await authenticatedAgent(ROLES.ADMIN)
      const client = await createClient(user.orgId)
      await createUserClient(user.userId, client.id)

      const response = await agent.delete(deleteClientUrl(client.id))

      expect(response.status).toBe(200)
      expect(response.body.message).toBe('Client deactivated')
    })

    it('rejects member users (no clients:update permission)', async () => {
      const { agent, user } = await authenticatedAgent(ROLES.MEMBER)
      const client = await createClient(user.orgId)

      const response = await agent.delete(deleteClientUrl(client.id))

      expectError(response, 403, ERROR_CODES.PERMISSION_DENIED)
    })
  })
})

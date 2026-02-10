import { expect } from 'vitest'
import request from 'supertest'
import {
  API_ROUTES,
  errorResponseSchema,
  type ErrorCode,
} from '@friendly-system/shared'
import { createServer } from '../../../server.js'
import {
  createVerifiedUser,
  createVerifiedUserWithRole,
} from '../../../test/factories/auth.factory.js'

export const app = createServer()

export function expectError(
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

export async function authenticatedAgent(role?: string) {
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

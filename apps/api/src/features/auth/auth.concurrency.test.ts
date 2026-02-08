import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { API_ROUTES } from '@friendly-system/shared'
import { createServer } from '../../server.js'
import { prisma } from '../../shared/db/prisma.js'
import { buildRegisterInput } from '../../test/db.js'
import {
  createVerifiedUser,
  issueEmailVerificationToken,
  issuePasswordResetToken,
} from '../../test/factories/auth.factory.js'

const app = createServer()

describe('Auth concurrency regression tests', () => {
  it('allows only one successful verify-email request per token', async () => {
    const payload = buildRegisterInput()
    await request(app).post(API_ROUTES.auth.register).send(payload)
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: payload.email },
      select: { id: true },
    })

    const token = await issueEmailVerificationToken(user.id, payload.email)

    const [first, second] = await Promise.all([
      request(app).post(API_ROUTES.auth.verifyEmail).send({ token }),
      request(app).post(API_ROUTES.auth.verifyEmail).send({ token }),
    ])

    const statuses = [first.status, second.status].sort((a, b) => a - b)
    expect(statuses).toEqual([200, 400])
  })

  it('verify-email remains one-time under high concurrency', async () => {
    const payload = buildRegisterInput()
    await request(app).post(API_ROUTES.auth.register).send(payload)
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: payload.email },
      select: { id: true },
    })

    const token = await issueEmailVerificationToken(user.id, payload.email)
    const attempts = Array.from({ length: 12 }, () =>
      request(app).post(API_ROUTES.auth.verifyEmail).send({ token }),
    )
    const responses = await Promise.all(attempts)

    const successes = responses.filter((r) => r.status === 200)
    const failures = responses.filter((r) => r.status === 400)
    expect(successes).toHaveLength(1)
    expect(failures).toHaveLength(11)
  })

  it('allows only one successful reset-password request per token', async () => {
    const user = await createVerifiedUser(app)
    const token = await issuePasswordResetToken(user.userId)

    const [first, second] = await Promise.all([
      request(app).post(API_ROUTES.auth.resetPassword).send({
        token,
        newPassword: 'BrandNewPass123!',
      }),
      request(app).post(API_ROUTES.auth.resetPassword).send({
        token,
        newPassword: 'AnotherPass123!',
      }),
    ])

    const statuses = [first.status, second.status].sort((a, b) => a - b)
    expect(statuses).toEqual([200, 400])
  })

  it('locks account after parallel failed login attempts', async () => {
    const user = await createVerifiedUser(app)

    const attempts = Array.from({ length: 8 }, () =>
      request(app).post(API_ROUTES.auth.login).send({
        email: user.email,
        password: 'WrongPassword123!',
      }),
    )
    await Promise.all(attempts)

    const locked = await prisma.user.findUniqueOrThrow({
      where: { id: user.userId },
      select: { failedLoginAttempts: true, lockedUntil: true },
    })
    expect(locked.failedLoginAttempts).toBeGreaterThanOrEqual(5)
    expect(locked.lockedUntil).not.toBeNull()
    expect(locked.lockedUntil!.getTime()).toBeGreaterThan(Date.now())

    const response = await request(app).post(API_ROUTES.auth.login).send({
      email: user.email,
      password: user.password,
    })
    expect(response.status).toBe(423)
  })
})

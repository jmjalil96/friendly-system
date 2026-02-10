import type { Express } from 'express'
import type { RegisterInput } from '@friendly-system/shared'
import request from 'supertest'
import { API_ROUTES, ROLES } from '@friendly-system/shared'
import { generateToken } from '../../shared/crypto/token.js'
import { prisma } from '../../shared/db/prisma.js'
import { buildRegisterInput } from '../db.js'

export interface VerifiedUserFixture {
  userId: string
  orgId: string
  email: string
  password: string
}

export async function registerUser(
  app: Express,
  overrides: Partial<RegisterInput> = {},
): Promise<RegisterInput> {
  const payload = buildRegisterInput(overrides)
  const response = await request(app)
    .post(API_ROUTES.auth.register)
    .send(payload)

  if (response.status !== 201) {
    throw new Error(
      `Failed to register test user. Status: ${response.status}, body: ${JSON.stringify(response.body)}`,
    )
  }

  return payload
}

export async function createVerifiedUser(
  app: Express,
  overrides: Partial<RegisterInput> = {},
): Promise<VerifiedUserFixture> {
  const payload = await registerUser(app, overrides)
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: payload.email },
    select: { id: true, orgId: true },
  })

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true },
  })

  return {
    userId: user.id,
    orgId: user.orgId,
    email: payload.email,
    password: payload.password,
  }
}

export function extractSessionCookie(response: request.Response): string {
  const rawCookies = response.headers['set-cookie']
  const cookies = Array.isArray(rawCookies)
    ? rawCookies
    : rawCookies
      ? [rawCookies]
      : []
  const sessionCookie = cookies.find((cookie: string) =>
    cookie.startsWith('session='),
  )
  if (!sessionCookie) {
    throw new Error('Missing session cookie in response')
  }
  return sessionCookie.split(';')[0]
}

export async function issueEmailVerificationToken(
  userId: string,
  email: string,
  expiresAt = new Date(Date.now() + 60 * 60 * 1000),
): Promise<string> {
  const { raw, hash } = generateToken()
  await prisma.emailVerificationToken.deleteMany({
    where: { userId },
  })
  await prisma.emailVerificationToken.create({
    data: {
      token: hash,
      userId,
      email,
      expiresAt,
    },
  })
  return raw
}

export async function createVerifiedUserWithRole(
  app: Express,
  roleName: string,
  overrides: Partial<RegisterInput> = {},
): Promise<VerifiedUserFixture> {
  const fixture = await createVerifiedUser(app, overrides)

  if (roleName !== ROLES.OWNER) {
    const role = await prisma.role.findUniqueOrThrow({
      where: { name: roleName },
    })
    await prisma.user.update({
      where: { id: fixture.userId },
      data: { roleId: role.id },
    })
  }

  return fixture
}

export async function issuePasswordResetToken(
  userId: string,
  expiresAt = new Date(Date.now() + 60 * 60 * 1000),
): Promise<string> {
  const { raw, hash } = generateToken()
  await prisma.passwordResetToken.create({
    data: {
      token: hash,
      userId,
      expiresAt,
    },
  })
  return raw
}

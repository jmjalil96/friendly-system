import { describe, expect, it } from 'vitest'
import request from 'supertest'
import {
  API_ROUTES,
  ERROR_CODES,
  errorResponseSchema,
  forgotPasswordResponseSchema,
  loginResponseSchema,
  meResponseSchema,
  registerResponseSchema,
  type ErrorCode,
} from '@friendly-system/shared'
import { createServer } from '../../server.js'
import { verifyPassword } from '../../shared/crypto/password.js'
import { prisma } from '../../shared/db/prisma.js'
import { buildRegisterInput, resetDb, uniqueEmail } from '../../test/db.js'
import {
  createVerifiedUser,
  extractSessionCookie,
  issueEmailVerificationToken,
  issuePasswordResetToken,
} from '../../test/factories/auth.factory.js'

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
  if (!parsed.success) {
    return
  }
  expect(parsed.data.error.statusCode).toBe(statusCode)
  expect(parsed.data.error.code).toBe(code)
  if (message) {
    expect(parsed.data.error.message).toBe(message)
  }
}

describe('Auth test harness: database reset behavior', () => {
  it('clears app data while preserving prisma migrations metadata', async () => {
    const before = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM "_prisma_migrations"
    `
    const beforeCount = Number(before[0]?.count ?? 0n)

    await request(app).post(API_ROUTES.auth.register).send(buildRegisterInput())
    const usersBeforeReset = await prisma.user.count()
    expect(usersBeforeReset).toBeGreaterThan(0)

    await resetDb()

    const usersAfterReset = await prisma.user.count()
    expect(usersAfterReset).toBe(0)

    const after = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM "_prisma_migrations"
    `
    const afterCount = Number(after[0]?.count ?? 0n)
    expect(afterCount).toBe(beforeCount)
  })
})

describe('Auth integration: register', () => {
  it('registers a user and persists auth artifacts', async () => {
    const payload = buildRegisterInput()
    const response = await request(app)
      .post(API_ROUTES.auth.register)
      .send(payload)

    expect(response.status).toBe(201)
    const parsed = registerResponseSchema.safeParse(response.body)
    expect(parsed.success).toBe(true)
    if (!parsed.success) {
      return
    }
    expect(parsed.data.email).toBe(payload.email)
    expect(parsed.data.message).toBe('Check your inbox to verify your email')

    const user = await prisma.user.findUnique({
      where: { email: payload.email },
      include: {
        profile: true,
        organization: true,
        emailVerificationTokens: true,
        auditLogs: true,
      },
    })

    expect(user).not.toBeNull()
    if (!user) {
      return
    }
    expect(user.emailVerified).toBe(false)
    expect(user.profile?.firstName).toBe(payload.firstName)
    expect(user.profile?.lastName).toBe(payload.lastName)
    expect(user.organization.name).toBe(payload.orgName)
    expect(user.emailVerificationTokens).toHaveLength(1)
    const registerAudit = user.auditLogs.find(
      (entry) => entry.action === 'user.registered',
    )
    expect(registerAudit).toBeDefined()
    expect(registerAudit!.resource).toBe('user')
    expect(registerAudit!.resourceId).toBe(user.id)
  })

  it('rejects duplicate email with 409', async () => {
    const existing = buildRegisterInput()
    await request(app).post(API_ROUTES.auth.register).send(existing)

    const response = await request(app)
      .post(API_ROUTES.auth.register)
      .send(
        buildRegisterInput({
          email: existing.email,
        }),
      )

    expectError(
      response,
      409,
      ERROR_CODES.AUTH_IDENTITY_UNAVAILABLE,
      'Email or organization name unavailable',
    )
  })

  it('rejects duplicate org slug with 409', async () => {
    const first = buildRegisterInput({ orgName: 'Acme!!!' })
    await request(app).post(API_ROUTES.auth.register).send(first)

    const response = await request(app)
      .post(API_ROUTES.auth.register)
      .send(buildRegisterInput({ orgName: 'Acme' }))

    expectError(
      response,
      409,
      ERROR_CODES.AUTH_IDENTITY_UNAVAILABLE,
      'Email or organization name unavailable',
    )
  })

  it('validates payload with 400', async () => {
    const response = await request(app).post(API_ROUTES.auth.register).send({
      email: 'bad',
      password: '123',
      firstName: '',
      lastName: '',
      orgName: '',
    })

    expectError(response, 400, ERROR_CODES.VALIDATION_ERROR)
  })

  it('rejects organization names that cannot generate a slug', async () => {
    const response = await request(app)
      .post(API_ROUTES.auth.register)
      .send(
        buildRegisterInput({
          orgName: '!!!',
        }),
      )

    expectError(
      response,
      400,
      ERROR_CODES.AUTH_INVALID_ORGANIZATION_NAME,
      'Organization name must contain at least one alphanumeric character',
    )
  })

  it('fails with 500 when required system roles are missing', async () => {
    await prisma.role.deleteMany({})

    const response = await request(app)
      .post(API_ROUTES.auth.register)
      .send(buildRegisterInput())

    expectError(
      response,
      500,
      ERROR_CODES.INTERNAL_ERROR,
      'System roles not configured',
    )
  })
})

describe('Auth integration: login', () => {
  it('logs in verified users and sets a session cookie', async () => {
    const user = await createVerifiedUser(app)

    const response = await request(app).post(API_ROUTES.auth.login).send({
      email: user.email,
      password: user.password,
    })

    expect(response.status).toBe(200)
    const parsed = loginResponseSchema.safeParse(response.body)
    expect(parsed.success).toBe(true)
    expect(response.headers['set-cookie']?.[0]).toContain('session=')
    expect(response.headers['set-cookie']?.[0]).toContain('HttpOnly')

    const sessions = await prisma.session.findMany({
      where: { userId: user.userId },
    })
    expect(sessions).toHaveLength(1)

    const auditEntry = await prisma.auditLog.findFirst({
      where: { userId: user.userId, action: 'user.logged_in' },
    })
    expect(auditEntry).not.toBeNull()
    expect(auditEntry!.resource).toBe('user')
    expect(auditEntry!.resourceId).toBe(user.userId)
  })

  it('returns generic 401 for unknown email', async () => {
    const response = await request(app)
      .post(API_ROUTES.auth.login)
      .send({
        email: uniqueEmail('missing'),
        password: 'Password123!',
      })

    expectError(
      response,
      401,
      ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      'Invalid email or password',
    )
  })

  it('increments failed login attempts on wrong password', async () => {
    const user = await createVerifiedUser(app)

    const response = await request(app).post(API_ROUTES.auth.login).send({
      email: user.email,
      password: 'WrongPassword123!',
    })

    expectError(
      response,
      401,
      ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      'Invalid email or password',
    )

    const updated = await prisma.user.findUniqueOrThrow({
      where: { id: user.userId },
      select: { failedLoginAttempts: true },
    })
    expect(updated.failedLoginAttempts).toBe(1)
  })

  it('locks account at threshold and blocks valid login while locked', async () => {
    const user = await createVerifiedUser(app)

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await request(app).post(API_ROUTES.auth.login).send({
        email: user.email,
        password: 'WrongPassword123!',
      })
      expectError(
        response,
        401,
        ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        'Invalid email or password',
      )
    }

    const lockedUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.userId },
      select: { failedLoginAttempts: true, lockedUntil: true },
    })
    expect(lockedUser.failedLoginAttempts).toBeGreaterThanOrEqual(5)
    expect(lockedUser.lockedUntil).not.toBeNull()
    expect(lockedUser.lockedUntil!.getTime()).toBeGreaterThan(Date.now())

    const response = await request(app).post(API_ROUTES.auth.login).send({
      email: user.email,
      password: user.password,
    })
    expectError(
      response,
      423,
      ERROR_CODES.AUTH_ACCOUNT_LOCKED,
      'Account temporarily locked',
    )
  })

  it('unlocks account after lock duration expires', async () => {
    const user = await createVerifiedUser(app)

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app).post(API_ROUTES.auth.login).send({
        email: user.email,
        password: 'WrongPassword123!',
      })
    }

    const locked = await prisma.user.findUniqueOrThrow({
      where: { id: user.userId },
      select: { lockedUntil: true },
    })
    expect(locked.lockedUntil).not.toBeNull()

    await prisma.user.update({
      where: { id: user.userId },
      data: { lockedUntil: new Date(Date.now() - 1_000) },
    })

    const response = await request(app).post(API_ROUTES.auth.login).send({
      email: user.email,
      password: user.password,
    })
    expect(response.status).toBe(200)

    const updated = await prisma.user.findUniqueOrThrow({
      where: { id: user.userId },
      select: { failedLoginAttempts: true, lockedUntil: true },
    })
    expect(updated.failedLoginAttempts).toBe(0)
    expect(updated.lockedUntil).toBeNull()
  })

  it('resets failed login attempts on successful login', async () => {
    const user = await createVerifiedUser(app)

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await request(app).post(API_ROUTES.auth.login).send({
        email: user.email,
        password: 'WrongPassword123!',
      })
    }

    const before = await prisma.user.findUniqueOrThrow({
      where: { id: user.userId },
      select: { failedLoginAttempts: true },
    })
    expect(before.failedLoginAttempts).toBe(3)

    const response = await request(app).post(API_ROUTES.auth.login).send({
      email: user.email,
      password: user.password,
    })
    expect(response.status).toBe(200)

    const after = await prisma.user.findUniqueOrThrow({
      where: { id: user.userId },
      select: { failedLoginAttempts: true },
    })
    expect(after.failedLoginAttempts).toBe(0)
  })

  it('rejects deactivated users', async () => {
    const user = await createVerifiedUser(app)
    await prisma.user.update({
      where: { id: user.userId },
      data: { isActive: false },
    })

    const response = await request(app).post(API_ROUTES.auth.login).send({
      email: user.email,
      password: user.password,
    })

    expectError(
      response,
      401,
      ERROR_CODES.AUTH_ACCOUNT_DEACTIVATED,
      'Account deactivated',
    )
  })

  it('rejects unverified users', async () => {
    const payload = buildRegisterInput()
    await request(app).post(API_ROUTES.auth.register).send(payload)

    const response = await request(app).post(API_ROUTES.auth.login).send({
      email: payload.email,
      password: payload.password,
    })

    expectError(
      response,
      403,
      ERROR_CODES.AUTH_EMAIL_NOT_VERIFIED,
      'Email not verified',
    )
  })
})

describe('Auth integration: me and logout', () => {
  it('returns current user profile for valid session', async () => {
    const user = await createVerifiedUser(app)
    const agent = request.agent(app)

    await agent.post(API_ROUTES.auth.login).send({
      email: user.email,
      password: user.password,
    })

    const response = await agent.get(API_ROUTES.auth.me)

    expect(response.status).toBe(200)
    const parsed = meResponseSchema.safeParse(response.body)
    expect(parsed.success).toBe(true)
    if (!parsed.success) {
      return
    }
    expect(parsed.data.email).toBe(user.email)
    expect(parsed.data.userId).toBe(user.userId)
  })

  it('requires session for /auth/me', async () => {
    const response = await request(app).get(API_ROUTES.auth.me)
    expectError(
      response,
      401,
      ERROR_CODES.AUTH_REQUIRED,
      'Authentication required',
    )
  })

  it('rejects invalid session tokens', async () => {
    const response = await request(app)
      .get(API_ROUTES.auth.me)
      .set('Cookie', 'session=invalid-session-token')

    expectError(
      response,
      401,
      ERROR_CODES.AUTH_SESSION_INVALID,
      'Invalid or expired session',
    )
  })

  it('rejects expired sessions', async () => {
    const user = await createVerifiedUser(app)
    const agent = request.agent(app)

    await agent.post(API_ROUTES.auth.login).send({
      email: user.email,
      password: user.password,
    })

    await prisma.session.updateMany({
      where: { userId: user.userId },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    })

    const response = await agent.get(API_ROUTES.auth.me)
    expectError(
      response,
      401,
      ERROR_CODES.AUTH_SESSION_INVALID,
      'Invalid or expired session',
    )
  })

  it('rejects requests from deactivated users with valid sessions', async () => {
    const user = await createVerifiedUser(app)
    const agent = request.agent(app)

    await agent.post(API_ROUTES.auth.login).send({
      email: user.email,
      password: user.password,
    })

    await prisma.user.update({
      where: { id: user.userId },
      data: { isActive: false },
    })

    const response = await agent.get(API_ROUTES.auth.me)
    expectError(
      response,
      401,
      ERROR_CODES.AUTH_ACCOUNT_DEACTIVATED,
      'Account deactivated',
    )
  })

  it('logs out and invalidates the session cookie', async () => {
    const user = await createVerifiedUser(app)
    const agent = request.agent(app)

    const loginResponse = await agent.post(API_ROUTES.auth.login).send({
      email: user.email,
      password: user.password,
    })
    const cookie = extractSessionCookie(loginResponse)
    expect(cookie.startsWith('session=')).toBe(true)

    const logoutResponse = await agent.post(API_ROUTES.auth.logout)
    expect(logoutResponse.status).toBe(200)
    expect(logoutResponse.body).toEqual({ message: 'Logged out' })

    const sessions = await prisma.session.findMany({
      where: { userId: user.userId },
    })
    expect(sessions).toHaveLength(0)

    const meResponse = await agent.get(API_ROUTES.auth.me)
    expectError(
      meResponse,
      401,
      ERROR_CODES.AUTH_REQUIRED,
      'Authentication required',
    )

    const auditEntry = await prisma.auditLog.findFirst({
      where: { userId: user.userId, action: 'user.logged_out' },
    })
    expect(auditEntry).not.toBeNull()
    expect(auditEntry!.resource).toBe('user')
    expect(auditEntry!.resourceId).toBe(user.userId)
  })

  it('requires authentication for logout', async () => {
    const response = await request(app).post(API_ROUTES.auth.logout)
    expectError(
      response,
      401,
      ERROR_CODES.AUTH_REQUIRED,
      'Authentication required',
    )
  })
})

describe('Auth integration: verify email and resend verification', () => {
  it('verifies email with valid token and rejects replay', async () => {
    const payload = buildRegisterInput()
    await request(app).post(API_ROUTES.auth.register).send(payload)
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: payload.email },
      select: { id: true },
    })
    const token = await issueEmailVerificationToken(user.id, payload.email)

    const verifyResponse = await request(app)
      .post(API_ROUTES.auth.verifyEmail)
      .send({ token })
    expect(verifyResponse.status).toBe(200)
    expect(verifyResponse.body).toEqual({ message: 'Email verified' })

    const updated = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { emailVerified: true },
    })
    expect(updated.emailVerified).toBe(true)

    const replayResponse = await request(app)
      .post(API_ROUTES.auth.verifyEmail)
      .send({ token })
    expectError(
      replayResponse,
      400,
      ERROR_CODES.AUTH_VERIFICATION_TOKEN_INVALID,
      'Invalid or expired verification token',
    )

    const auditEntry = await prisma.auditLog.findFirst({
      where: { userId: user.id, action: 'user.email_verified' },
    })
    expect(auditEntry).not.toBeNull()
    expect(auditEntry!.resource).toBe('user')
    expect(auditEntry!.resourceId).toBe(user.id)
  })

  it('rejects expired verification token', async () => {
    const payload = buildRegisterInput()
    await request(app).post(API_ROUTES.auth.register).send(payload)
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: payload.email },
      select: { id: true },
    })
    const token = await issueEmailVerificationToken(
      user.id,
      payload.email,
      new Date(Date.now() - 1_000),
    )

    const response = await request(app)
      .post(API_ROUTES.auth.verifyEmail)
      .send({ token })
    expectError(
      response,
      400,
      ERROR_CODES.AUTH_VERIFICATION_TOKEN_INVALID,
      'Invalid or expired verification token',
    )
  })

  it('resend verification returns generic message for unknown email', async () => {
    const response = await request(app)
      .post(API_ROUTES.auth.resendVerification)
      .send({ email: uniqueEmail('unknown') })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      message: 'If that email is registered, a verification link has been sent',
    })
  })

  it('resend verification rotates token for unverified active users', async () => {
    const payload = buildRegisterInput()
    await request(app).post(API_ROUTES.auth.register).send(payload)
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: payload.email },
      select: { id: true, orgId: true },
    })
    const initialToken = await prisma.emailVerificationToken.findFirstOrThrow({
      where: { userId: user.id },
      select: { token: true },
    })

    const response = await request(app)
      .post(API_ROUTES.auth.resendVerification)
      .send({ email: payload.email })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      message: 'If that email is registered, a verification link has been sent',
    })

    const tokens = await prisma.emailVerificationToken.findMany({
      where: { userId: user.id },
      select: { token: true },
    })
    expect(tokens).toHaveLength(1)
    expect(tokens[0].token).not.toBe(initialToken.token)

    const auditEntry = await prisma.auditLog.findFirst({
      where: { userId: user.id, action: 'user.verification_resent' },
    })
    expect(auditEntry).not.toBeNull()
    expect(auditEntry!.resource).toBe('user')
    expect(auditEntry!.resourceId).toBe(user.id)
  })

  it('resend verification is generic for verified and deactivated users', async () => {
    const verified = await createVerifiedUser(app)
    await prisma.user.update({
      where: { id: verified.userId },
      data: { isActive: false },
    })

    const response = await request(app)
      .post(API_ROUTES.auth.resendVerification)
      .send({ email: verified.email })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      message: 'If that email is registered, a verification link has been sent',
    })
  })

  it('resend verification is generic for deactivated unverified users', async () => {
    const payload = buildRegisterInput()
    await request(app).post(API_ROUTES.auth.register).send(payload)
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: payload.email },
      select: { id: true },
    })

    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    })

    const response = await request(app)
      .post(API_ROUTES.auth.resendVerification)
      .send({ email: payload.email })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      message: 'If that email is registered, a verification link has been sent',
    })
  })
})

describe('Auth integration: forgot and reset password', () => {
  it('forgot password returns generic message for unknown email', async () => {
    const email = uniqueEmail('no-user')
    const response = await request(app)
      .post(API_ROUTES.auth.forgotPassword)
      .send({ email })

    expect(response.status).toBe(200)
    const parsed = forgotPasswordResponseSchema.safeParse(response.body)
    expect(parsed.success).toBe(true)
    if (!parsed.success) {
      return
    }
    expect(parsed.data.email).toBe(email)
    expect(parsed.data.message).toBe(
      'If that email is registered, a password reset link has been sent',
    )
  })

  it('forgot password creates and rotates reset token for verified users', async () => {
    const user = await createVerifiedUser(app)

    const first = await request(app)
      .post(API_ROUTES.auth.forgotPassword)
      .send({ email: user.email })
    expect(first.status).toBe(200)

    const tokenAfterFirst = await prisma.passwordResetToken.findFirstOrThrow({
      where: { userId: user.userId },
      select: { token: true },
    })

    const second = await request(app)
      .post(API_ROUTES.auth.forgotPassword)
      .send({ email: user.email })
    expect(second.status).toBe(200)

    const tokens = await prisma.passwordResetToken.findMany({
      where: { userId: user.userId },
      select: { token: true },
    })
    expect(tokens).toHaveLength(1)
    expect(tokens[0].token).not.toBe(tokenAfterFirst.token)
  })

  it('forgot password returns generic message for unverified and deactivated users', async () => {
    const payload = buildRegisterInput()
    await request(app).post(API_ROUTES.auth.register).send(payload)
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: payload.email },
      select: { id: true },
    })

    const unverifiedResponse = await request(app)
      .post(API_ROUTES.auth.forgotPassword)
      .send({ email: payload.email })
    expect(unverifiedResponse.status).toBe(200)

    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    })

    const deactivatedResponse = await request(app)
      .post(API_ROUTES.auth.forgotPassword)
      .send({ email: payload.email })
    expect(deactivatedResponse.status).toBe(200)
  })

  it('forgot password returns generic message for verified deactivated users', async () => {
    const user = await createVerifiedUser(app)
    await prisma.user.update({
      where: { id: user.userId },
      data: { isActive: false },
    })

    const response = await request(app)
      .post(API_ROUTES.auth.forgotPassword)
      .send({ email: user.email })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      message:
        'If that email is registered, a password reset link has been sent',
      email: user.email,
    })
  })

  it('resets password with valid token and revokes all sessions', async () => {
    const user = await createVerifiedUser(app)
    await request(app).post(API_ROUTES.auth.login).send({
      email: user.email,
      password: user.password,
    })
    await request(app).post(API_ROUTES.auth.login).send({
      email: user.email,
      password: user.password,
    })

    const token = await issuePasswordResetToken(user.userId)
    const response = await request(app)
      .post(API_ROUTES.auth.resetPassword)
      .send({
        token,
        newPassword: 'BrandNewPass123!',
      })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ message: 'Password reset' })

    const updated = await prisma.user.findUniqueOrThrow({
      where: { id: user.userId },
      select: { passwordHash: true, passwordChangedAt: true },
    })
    expect(updated.passwordChangedAt).not.toBeNull()
    await expect(
      verifyPassword('BrandNewPass123!', updated.passwordHash),
    ).resolves.toBe(true)

    const remainingSessions = await prisma.session.count({
      where: { userId: user.userId },
    })
    expect(remainingSessions).toBe(0)

    const oldPasswordLogin = await request(app)
      .post(API_ROUTES.auth.login)
      .send({
        email: user.email,
        password: user.password,
      })
    expectError(
      oldPasswordLogin,
      401,
      ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      'Invalid email or password',
    )

    const newPasswordLogin = await request(app)
      .post(API_ROUTES.auth.login)
      .send({
        email: user.email,
        password: 'BrandNewPass123!',
      })
    expect(newPasswordLogin.status).toBe(200)

    const auditEntry = await prisma.auditLog.findFirst({
      where: { userId: user.userId, action: 'user.password_reset' },
    })
    expect(auditEntry).not.toBeNull()
    expect(auditEntry!.resource).toBe('user')
    expect(auditEntry!.resourceId).toBe(user.userId)
  })

  it('rejects replayed, expired, and invalid reset tokens', async () => {
    const user = await createVerifiedUser(app)
    const token = await issuePasswordResetToken(user.userId)

    const first = await request(app).post(API_ROUTES.auth.resetPassword).send({
      token,
      newPassword: 'BrandNewPass123!',
    })
    expect(first.status).toBe(200)

    const replay = await request(app).post(API_ROUTES.auth.resetPassword).send({
      token,
      newPassword: 'AnotherPass123!',
    })
    expectError(
      replay,
      400,
      ERROR_CODES.AUTH_RESET_TOKEN_INVALID,
      'Invalid or expired reset token',
    )

    const expired = await issuePasswordResetToken(
      user.userId,
      new Date(Date.now() - 1_000),
    )
    const expiredResponse = await request(app)
      .post(API_ROUTES.auth.resetPassword)
      .send({
        token: expired,
        newPassword: 'AnotherPass123!',
      })
    expectError(
      expiredResponse,
      400,
      ERROR_CODES.AUTH_RESET_TOKEN_INVALID,
      'Invalid or expired reset token',
    )

    const invalidResponse = await request(app)
      .post(API_ROUTES.auth.resetPassword)
      .send({
        token: 'not-a-real-token',
        newPassword: 'AnotherPass123!',
      })
    expectError(
      invalidResponse,
      400,
      ERROR_CODES.AUTH_RESET_TOKEN_INVALID,
      'Invalid or expired reset token',
    )
  })
})

describe('Auth integration: change password', () => {
  it('changes password for authenticated user and keeps only current session', async () => {
    const user = await createVerifiedUser(app)
    const agent = request.agent(app)

    await agent.post(API_ROUTES.auth.login).send({
      email: user.email,
      password: user.password,
    })
    await request(app).post(API_ROUTES.auth.login).send({
      email: user.email,
      password: user.password,
    })

    const before = await prisma.session.count({
      where: { userId: user.userId },
    })
    expect(before).toBe(2)

    const response = await agent.post(API_ROUTES.auth.changePassword).send({
      currentPassword: user.password,
      newPassword: 'Password456!',
    })
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ message: 'Password changed' })

    const after = await prisma.session.count({ where: { userId: user.userId } })
    expect(after).toBe(1)

    const oldPasswordLogin = await request(app)
      .post(API_ROUTES.auth.login)
      .send({
        email: user.email,
        password: user.password,
      })
    expectError(
      oldPasswordLogin,
      401,
      ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      'Invalid email or password',
    )

    const newPasswordLogin = await request(app)
      .post(API_ROUTES.auth.login)
      .send({
        email: user.email,
        password: 'Password456!',
      })
    expect(newPasswordLogin.status).toBe(200)

    const auditEntry = await prisma.auditLog.findFirst({
      where: { userId: user.userId, action: 'user.password_changed' },
    })
    expect(auditEntry).not.toBeNull()
    expect(auditEntry!.resource).toBe('user')
    expect(auditEntry!.resourceId).toBe(user.userId)
  })

  it('rejects wrong current password', async () => {
    const user = await createVerifiedUser(app)
    const agent = request.agent(app)

    await agent.post(API_ROUTES.auth.login).send({
      email: user.email,
      password: user.password,
    })

    const response = await agent.post(API_ROUTES.auth.changePassword).send({
      currentPassword: 'WrongPassword123!',
      newPassword: 'Password456!',
    })
    expectError(
      response,
      401,
      ERROR_CODES.AUTH_CURRENT_PASSWORD_INCORRECT,
      'Current password is incorrect',
    )
  })

  it('requires authentication for password change', async () => {
    const response = await request(app)
      .post(API_ROUTES.auth.changePassword)
      .send({
        currentPassword: 'Password123!',
        newPassword: 'Password456!',
      })
    expectError(
      response,
      401,
      ERROR_CODES.AUTH_REQUIRED,
      'Authentication required',
    )
  })
})

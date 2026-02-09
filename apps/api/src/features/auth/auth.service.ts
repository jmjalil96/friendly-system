import { Prisma } from '@prisma/client'
import type {
  RegisterInput,
  LoginInput,
  LoginResponse,
} from '@friendly-system/shared'
import { ERROR_CODES, ROLES } from '@friendly-system/shared'
import { prisma } from '../../shared/db/prisma.js'
import { hashPassword, verifyPassword } from '../../shared/crypto/password.js'
import { generateToken, hashToken } from '../../shared/crypto/token.js'
import { slugify } from '../../shared/slug.js'
import { AppError } from '../../shared/middleware/error-handler.js'
import { getUniqueViolationFields } from '../../shared/db/prisma-errors.js'
import { logger } from '../../shared/logger.js'
import type { RequestContext } from '../../shared/types.js'
import {
  SESSION_EXPIRY_DAYS,
  VERIFICATION_TOKEN_EXPIRY_HOURS,
  PASSWORD_RESET_TOKEN_EXPIRY_HOURS,
  MAX_FAILED_ATTEMPTS,
  LOCK_DURATION_MINUTES,
} from './auth.constants.js'

export async function register(
  input: RegisterInput,
  ctx: RequestContext,
): Promise<void> {
  const { email, password, firstName, lastName, orgName } = input

  const slug = slugify(orgName)
  if (!slug) {
    throw new AppError(
      400,
      'Organization name must contain at least one alphanumeric character',
      ERROR_CODES.AUTH_INVALID_ORGANIZATION_NAME,
    )
  }

  const ownerRole = await prisma.role.findUnique({
    where: { name: ROLES.OWNER },
  })
  if (!ownerRole) {
    throw new AppError(
      500,
      'System roles not configured',
      ERROR_CODES.INTERNAL_ERROR,
    )
  }

  const passwordHash = await hashPassword(password)

  const { raw: verificationToken, hash: tokenHash } = generateToken()
  const expiresAt = new Date(
    Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
  )

  try {
    const user = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: orgName, slug },
      })

      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          orgId: org.id,
          roleId: ownerRole.id,
        },
      })

      await tx.userProfile.create({
        data: {
          userId: newUser.id,
          firstName,
          lastName,
        },
      })

      await tx.emailVerificationToken.create({
        data: {
          token: tokenHash,
          userId: newUser.id,
          email,
          expiresAt,
        },
      })

      await tx.auditLog.create({
        data: {
          userId: newUser.id,
          orgId: org.id,
          action: 'user.registered',
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        },
      })

      return newUser
    })

    logger.info(
      { userId: user.id, orgSlug: slug, verificationToken },
      'User registered',
    )
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const fields = getUniqueViolationFields(error)
      if (fields.includes('email')) {
        logger.warn({ email }, 'Registration attempted with existing email')
      }
      if (fields.includes('slug')) {
        logger.warn({ slug }, 'Registration attempted with taken org slug')
      }
      if (fields.includes('email') || fields.includes('slug')) {
        throw new AppError(
          409,
          'Email or organization name unavailable',
          ERROR_CODES.AUTH_IDENTITY_UNAVAILABLE,
        )
      }
    }
    throw error
  }
}

export async function login(
  input: LoginInput,
  ctx: RequestContext,
): Promise<LoginResponse & { sessionToken: string }> {
  const { email, password } = input

  const user = await prisma.user.findUnique({
    where: { email },
    include: { profile: true, organization: true, role: true },
  })

  if (!user) {
    logger.warn({ email }, 'Login attempted with unknown email')
    throw new AppError(
      401,
      'Invalid email or password',
      ERROR_CODES.AUTH_INVALID_CREDENTIALS,
    )
  }

  if (!user.isActive) {
    logger.warn({ userId: user.id }, 'Login attempted on deactivated account')
    throw new AppError(
      401,
      'Account deactivated',
      ERROR_CODES.AUTH_ACCOUNT_DEACTIVATED,
    )
  }

  if (!user.emailVerified) {
    logger.warn({ userId: user.id }, 'Login attempted with unverified email')
    throw new AppError(
      403,
      'Email not verified',
      ERROR_CODES.AUTH_EMAIL_NOT_VERIFIED,
    )
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    logger.warn(
      { userId: user.id, lockedUntil: user.lockedUntil },
      'Login attempted on locked account',
    )
    throw new AppError(
      423,
      'Account temporarily locked',
      ERROR_CODES.AUTH_ACCOUNT_LOCKED,
    )
  }

  const passwordValid = await verifyPassword(password, user.passwordHash)

  if (!passwordValid) {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: { increment: 1 } },
      select: { failedLoginAttempts: true },
    })

    if (updated.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lockedUntil: new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000),
        },
      })
      logger.warn(
        { userId: user.id, failedAttempts: updated.failedLoginAttempts },
        'Account locked after failed attempts',
      )
    } else {
      logger.warn(
        { userId: user.id, failedAttempts: updated.failedLoginAttempts },
        'Failed login attempt',
      )
    }

    throw new AppError(
      401,
      'Invalid email or password',
      ERROR_CODES.AUTH_INVALID_CREDENTIALS,
    )
  }

  const { raw: sessionToken, hash: sessionHash } = generateToken()
  const expiresAt = new Date(
    Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  )

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    })

    await tx.session.create({
      data: {
        token: sessionHash,
        userId: user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        expiresAt,
      },
    })

    await tx.auditLog.create({
      data: {
        userId: user.id,
        orgId: user.orgId,
        action: 'user.logged_in',
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    })
  })

  logger.info({ userId: user.id }, 'User logged in')

  return {
    userId: user.id,
    email: user.email,
    firstName: user.profile?.firstName ?? null,
    lastName: user.profile?.lastName ?? null,
    orgSlug: user.organization.slug,
    role: user.role.name,
    sessionToken,
  }
}

export async function logout(
  userId: string,
  orgId: string,
  sessionId: string,
  ctx: RequestContext,
): Promise<void> {
  await prisma.session.delete({ where: { id: sessionId } })

  await prisma.auditLog.create({
    data: {
      userId,
      orgId,
      action: 'user.logged_out',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
  })

  logger.info({ userId }, 'User logged out')
}

export async function verifyEmail(
  token: string,
  ctx: RequestContext,
): Promise<void> {
  const tokenHash = hashToken(token)

  const verificationToken = await prisma.emailVerificationToken.findUnique({
    where: { token: tokenHash },
    include: { user: { select: { id: true, orgId: true } } },
  })

  if (
    !verificationToken ||
    verificationToken.expiresAt < new Date() ||
    verificationToken.usedAt !== null
  ) {
    logger.warn(
      { tokenHash },
      'Email verification attempted with invalid token',
    )
    throw new AppError(
      400,
      'Invalid or expired verification token',
      ERROR_CODES.AUTH_VERIFICATION_TOKEN_INVALID,
    )
  }

  const used = await prisma.$transaction(async (tx) => {
    const claimed = await tx.emailVerificationToken.updateMany({
      where: { id: verificationToken.id, usedAt: null },
      data: { usedAt: new Date() },
    })

    if (claimed.count === 0) return false

    await tx.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerified: true },
    })

    await tx.auditLog.create({
      data: {
        userId: verificationToken.userId,
        orgId: verificationToken.user.orgId,
        action: 'user.email_verified',
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    })

    return true
  })

  if (!used) {
    logger.warn(
      { tokenHash },
      'Email verification token already consumed (concurrent request)',
    )
    throw new AppError(
      400,
      'Invalid or expired verification token',
      ERROR_CODES.AUTH_VERIFICATION_TOKEN_INVALID,
    )
  }

  logger.info({ userId: verificationToken.userId }, 'Email verified')
}

export async function resendVerification(
  email: string,
  ctx: RequestContext,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, orgId: true, emailVerified: true, isActive: true },
  })

  if (!user) {
    logger.warn({ email }, 'Verification resend attempted for unknown email')
    return
  }

  if (user.emailVerified) {
    logger.warn(
      { userId: user.id },
      'Verification resend attempted for already verified user',
    )
    return
  }

  if (!user.isActive) {
    logger.warn(
      { userId: user.id },
      'Verification resend attempted for deactivated account',
    )
    return
  }

  const { raw: verificationToken, hash: tokenHash } = generateToken()
  const expiresAt = new Date(
    Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
  )

  await prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.deleteMany({
      where: { userId: user.id },
    })

    await tx.emailVerificationToken.create({
      data: {
        token: tokenHash,
        userId: user.id,
        email,
        expiresAt,
      },
    })

    await tx.auditLog.create({
      data: {
        userId: user.id,
        orgId: user.orgId,
        action: 'user.verification_resent',
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    })
  })

  logger.info(
    { userId: user.id, verificationToken },
    'Verification email resent',
  )
}

export async function forgotPassword(
  email: string,
  ctx: RequestContext,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, orgId: true, emailVerified: true, isActive: true },
  })

  if (!user) {
    logger.warn({ email }, 'Password reset requested for unknown email')
    return
  }

  if (!user.emailVerified) {
    logger.warn(
      { userId: user.id },
      'Password reset requested for unverified user',
    )
    return
  }

  if (!user.isActive) {
    logger.warn(
      { userId: user.id },
      'Password reset requested for deactivated account',
    )
    return
  }

  const { raw: resetToken, hash: tokenHash } = generateToken()
  const expiresAt = new Date(
    Date.now() + PASSWORD_RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
  )

  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.deleteMany({
      where: { userId: user.id },
    })

    await tx.passwordResetToken.create({
      data: {
        token: tokenHash,
        userId: user.id,
        expiresAt,
      },
    })

    await tx.auditLog.create({
      data: {
        userId: user.id,
        orgId: user.orgId,
        action: 'user.password_reset_requested',
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    })
  })

  logger.info({ userId: user.id, resetToken }, 'Password reset requested')
}

export async function resetPassword(
  token: string,
  newPassword: string,
  ctx: RequestContext,
): Promise<void> {
  const tokenHash = hashToken(token)

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token: tokenHash },
    include: { user: { select: { id: true, orgId: true } } },
  })

  if (
    !resetToken ||
    resetToken.expiresAt < new Date() ||
    resetToken.usedAt !== null
  ) {
    logger.warn({ tokenHash }, 'Password reset attempted with invalid token')
    throw new AppError(
      400,
      'Invalid or expired reset token',
      ERROR_CODES.AUTH_RESET_TOKEN_INVALID,
    )
  }

  const passwordHash = await hashPassword(newPassword)

  const used = await prisma.$transaction(async (tx) => {
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: resetToken.id, usedAt: null },
      data: { usedAt: new Date() },
    })

    if (claimed.count === 0) return false

    await tx.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    })

    await tx.session.deleteMany({
      where: { userId: resetToken.userId },
    })

    await tx.auditLog.create({
      data: {
        userId: resetToken.userId,
        orgId: resetToken.user.orgId,
        action: 'user.password_reset',
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    })

    return true
  })

  if (!used) {
    logger.warn(
      { tokenHash },
      'Password reset token already consumed (concurrent request)',
    )
    throw new AppError(
      400,
      'Invalid or expired reset token',
      ERROR_CODES.AUTH_RESET_TOKEN_INVALID,
    )
  }

  logger.info({ userId: resetToken.userId }, 'Password reset')
}

export async function changePassword(
  userId: string,
  orgId: string,
  sessionId: string,
  input: { currentPassword: string; newPassword: string },
  ctx: RequestContext,
): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { passwordHash: true },
  })

  const currentValid = await verifyPassword(
    input.currentPassword,
    user.passwordHash,
  )
  if (!currentValid) {
    logger.warn(
      { userId },
      'Password change attempted with wrong current password',
    )
    throw new AppError(
      401,
      'Current password is incorrect',
      ERROR_CODES.AUTH_CURRENT_PASSWORD_INCORRECT,
    )
  }

  const passwordHash = await hashPassword(input.newPassword)

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
      },
    })

    await tx.session.deleteMany({
      where: {
        userId,
        id: { not: sessionId },
      },
    })

    await tx.auditLog.create({
      data: {
        userId,
        orgId,
        action: 'user.password_changed',
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    })
  })

  logger.info({ userId }, 'Password changed')
}

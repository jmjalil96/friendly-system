import type { RequestHandler } from 'express'
import { ERROR_CODES } from '@friendly-system/shared'
import { prisma } from '../db/prisma.js'
import { hashToken } from '../crypto/token.js'
import { AppError } from './error-handler.js'
import { SESSION_COOKIE_NAME } from './session-cookie.js'
import { logger } from '../logger.js'

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const sessionToken = req.cookies[SESSION_COOKIE_NAME]
  if (!sessionToken) {
    throw new AppError(
      401,
      'Authentication required',
      ERROR_CODES.AUTH_REQUIRED,
    )
  }

  const tokenHash = hashToken(sessionToken)

  const session = await prisma.session.findUnique({
    where: { token: tokenHash },
    include: {
      user: {
        include: {
          profile: true,
          organization: true,
          role: true,
        },
      },
    },
  })

  if (!session || session.expiresAt < new Date()) {
    logger.warn({ tokenHash }, 'Request with invalid or expired session')
    throw new AppError(
      401,
      'Invalid or expired session',
      ERROR_CODES.AUTH_SESSION_INVALID,
    )
  }

  if (!session.user.isActive) {
    logger.warn({ userId: session.userId }, 'Request from deactivated account')
    throw new AppError(
      401,
      'Account deactivated',
      ERROR_CODES.AUTH_ACCOUNT_DEACTIVATED,
    )
  }

  req.user = {
    userId: session.user.id,
    email: session.user.email,
    firstName: session.user.profile?.firstName ?? null,
    lastName: session.user.profile?.lastName ?? null,
    orgId: session.user.orgId,
    orgSlug: session.user.organization.slug,
    role: session.user.role.name,
  }

  req.sessionInfo = {
    sessionId: session.id,
  }

  next()
}

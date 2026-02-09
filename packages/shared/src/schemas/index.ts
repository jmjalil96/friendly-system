import { z } from 'zod'
import { ERROR_CODES } from '../constants/index.js'

export const appConfigSchema = z.object({
  name: z.string(),
})

export type AppConfig = z.infer<typeof appConfigSchema>

const errorCodeValues = [
  ERROR_CODES.BAD_REQUEST,
  ERROR_CODES.VALIDATION_ERROR,
  ERROR_CODES.UNAUTHORIZED,
  ERROR_CODES.FORBIDDEN,
  ERROR_CODES.NOT_FOUND,
  ERROR_CODES.METHOD_NOT_ALLOWED,
  ERROR_CODES.CONFLICT,
  ERROR_CODES.PAYLOAD_TOO_LARGE,
  ERROR_CODES.UNSUPPORTED_MEDIA_TYPE,
  ERROR_CODES.UNPROCESSABLE_ENTITY,
  ERROR_CODES.TOO_MANY_REQUESTS,
  ERROR_CODES.CLIENT_ERROR,
  ERROR_CODES.INTERNAL_ERROR,
  ERROR_CODES.AUTH_REQUIRED,
  ERROR_CODES.AUTH_SESSION_INVALID,
  ERROR_CODES.AUTH_ACCOUNT_DEACTIVATED,
  ERROR_CODES.AUTH_INVALID_CREDENTIALS,
  ERROR_CODES.AUTH_EMAIL_NOT_VERIFIED,
  ERROR_CODES.AUTH_ACCOUNT_LOCKED,
  ERROR_CODES.AUTH_CURRENT_PASSWORD_INCORRECT,
  ERROR_CODES.AUTH_VERIFICATION_TOKEN_INVALID,
  ERROR_CODES.AUTH_RESET_TOKEN_INVALID,
  ERROR_CODES.AUTH_IDENTITY_UNAVAILABLE,
  ERROR_CODES.AUTH_INVALID_ORGANIZATION_NAME,
] as const

export const errorCodeSchema = z.enum(errorCodeValues)

export const errorResponseSchema = z.object({
  error: z.object({
    message: z.string(),
    statusCode: z.number(),
    code: errorCodeSchema,
  }),
})

export type ErrorResponse = z.infer<typeof errorResponseSchema>

export * from './auth.schemas.js'

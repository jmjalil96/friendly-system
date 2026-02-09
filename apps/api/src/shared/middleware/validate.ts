import type { RequestHandler } from 'express'
import type { ZodType, ZodIssue } from 'zod'
import { ERROR_CODES } from '@friendly-system/shared'
import { AppError } from './error-handler.js'
import { logger } from '../logger.js'

interface ValidationSchemas {
  body?: ZodType
  params?: ZodType
  query?: ZodType
}

export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req, _res, next) => {
    for (const [key, schema] of Object.entries(schemas)) {
      const result = schema.safeParse(req[key as keyof typeof schemas])
      if (!result.success) {
        const message = result.error.issues
          .map((i: ZodIssue) => i.message)
          .join(', ')
        logger.debug(
          { source: key, issues: result.error.issues },
          'Validation failed',
        )
        next(new AppError(400, message, ERROR_CODES.VALIDATION_ERROR))
        return
      }
      Object.assign(req, { [key]: result.data })
    }
    next()
  }
}

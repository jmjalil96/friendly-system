import type { RequestHandler } from 'express'
import type { ZodType, ZodIssue } from 'zod'
import { AppError } from './error-handler.js'

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
        next(
          new AppError(
            400,
            result.error.issues.map((i: ZodIssue) => i.message).join(', '),
          ),
        )
        return
      }
      Object.assign(req, { [key]: result.data })
    }
    next()
  }
}
